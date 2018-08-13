let express = require('express');
let app = express();
let bodyParser = require('body-parser');
var path = require("path");
let XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
let base64 = require("base-64");

const port = 80;
const internalServerError = 500;
const OK = 200;
const NOTFOUND = 404;

const client_id = "ramon-test";
const client_secret = "Oox5bUpUKKtG07lWfQWztJgWB3wazc5Su8Mz1l3tKBqTn45ohzemH1wA5ZiHrb8iDiM3Q5Yso8cazz5ue5e2Tw";
const base64Auth = base64.encode(client_id + ":" + client_secret);


const redirect_uri = "http://localhost/callback";
var access_token;
var refresh_token;

//These are static directories for the webpage to access.
app.use(express.static(__dirname));
app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({extended: true}));

/**
 * Sends the index.html file to the client.
 */
app.get('/', sendIndex);

app.get('/callback', retrieveCallbackInfo);


app.get('/user', function(req, res){
    // Make the /user call of the PayMaya API retrieving the information of the user.
    makeRequest("GET","/profile", res, false, 'Profile_Request', null, false);
});

app.get('/balance', function(req, res){
    // Make the /balance call and send the balance to the html file.
    makeRequest("GET","/balance", res, true, 'Balance_Request', null, false)
});

app.post('/transfer', function(req,res){
    // Initiate the transfer of money.
    console.log('Received transfer request with the body: ');
    console.log(req.body);
    var alias = req.body.alias;
    var amount = req.body.amount;
    var note = req.body.note;
    
    var body = {
        "recipient": {
            "type": "PAYMAYA",
            "value": alias
        },
        "amount": {
            "currency": "PHP",
            "value": amount
        },
        "note": note
        }

    makeRequest('POST','/transfer', res, true, 'Transfer_Request', body, false);
});

app.put('/confirm', function(req,res){
    
    var type = req.body.type;
    var request;
    if(type == 'transfer'){
        var alias = req.body.alias;
        console.log('Confirming transfer request with the ID: ' + alias);
        request = '/transfer/' + alias + '/execute';
        makeRequest('PUT',request, res, false, 'Transfer_Request', null, false);
    }else if(type == 'payment'){
        //TODO: TEST
        // Executes a bill payment.
        var billerID = req.body.billerID;
        console.log('Confirming payment to the Biller ID: ' + billerID);
        request = '/billpayment/' + billerID + '/execute';
        makeRequest('POST', request,res,true,'Payment_Request_Confirmation', null, false);
    }
});

/**
 * Cancels an initiated Transaction.
 */
app.post('/cancel', function(req,res){
    var alias = req.body.alias;
    var request = '/transfer/' + alias;        
    makeRequest('DELETE',request, res, false, 'Transfer_Request', null, false);
});

app.get('/productCatalog', function(req,res){
    makeRequest('GET','/shop/products', res, false, 'Retrieve_Catalog', null, false);
});

app.post('/purchase', function(req,res){
    //TODO: Test this.
    var body = {
        "purchaseId": req.body.purchaseId,
        "productId": req.body.productId
        }
    makeRequest('POST','/shop/purchase', res, true, 'Retrieve_Catalog', body, false);

});

// Requests and sends the list of all the billers.
app.get('/billers', function(req,res){
    makeRequest('GET','/billers', res, true, 'Get_Billers', null, true);
});

// Makes a P100 payment to a biller.
app.post('/payBill', function(req,res){
    //TODO: Update the body object and make sure it works.
    var billerID = req.body.billerID
    var body =  {
        "biller": billerID,
        "amount": {
            "currency": "PHP",
            "value": 100,
        }
    }
    makeRequest('POST','/billpayment', res, true, 'Init_billpayment', body, false);
});

/**
 * This function will be used to make any request to the PayMaya Sandbox API. 
 * 
 * It is used to take a request from a client which will then make a request to the PayMaya wallet API. 
 * Once a response is received from the API, the same response will be sent back to the client as a 
 * JSON object.
 * @param {String} requestType Is the type of request made to the url.
 * @param {String} endpoint Is the destination for the request of a given URL.
 * @param {Object} res Is the response object.
 * @param {boolean} isJson Determines whether to include a json content type header.
 * @param {String} requestNo Will be used to verify and retrieve request information by PayMaya
 * @param {Object} body Is the Request body.
 * @param {boolean} basicAuth Determines whether or not to use basic-auth authorization. If false, an access token will be used instead.
 */
function makeRequest(requestType, endpoint, res, isJson, requestNo, body, basicAuth){
    // Checks if the User is authenticated with an access token.
    if(access_token != null){
        var request = new XMLHttpRequest();
        request.open(requestType, "https://api-test.paymaya.com/external-api-sandbox/v1/" + endpoint,false);
        if(isJson){
            request.setRequestHeader('Content-Type', 'application/json');
        }

        // Authentication varies between basic authentication or access token.
        if(basicAuth) request.setRequestHeader('Authorization', 'Basic ' + base64Auth);
        else request.setRequestHeader('Authorization', 'Bearer ' + access_token);

        // The required Reference number of each request made to the PayMaya API.
        request.setRequestHeader('Request-Reference-No', requestNo);

        request.send(JSON.stringify(body));

        // The response sent to the client which made the request.
        res.send(request.responseText);
        res.status(request.status);
        
        console.log("\nRequest Status returned as " + request.status);
        if(request.status == 200 || request.status == 201){
            console.log("Access to endpoint " + endpoint + " was successful.");
        }else{
            console.log("An error has occurred.")
            console.log("Please check the returned response on the client.");
        }
    }else{
        missingAccTok(res);
    }
}

/**
 * Create an error response similar to the makeRequest()
 */

/**
 * Create my own way to track the transaction history of an account.
 */

 /**
  * Sends the Default index page.
  */
function sendIndex(req,res){
    console.log('Request Type: ', req.method);
    res.status(OK);
    res.sendFile(path.join(__dirname,'./index.html'));

}

/**
 * Retrieves the required tokens and information from the callback page.
 * 
 * @param {Object} req 
 * @param {Object} res 
 */
function retrieveCallbackInfo(req,res){
    res.sendFile(path.join(__dirname,'./index.html'));
    let code = req.query.code;
    console.log("The Authentication Code is: " + code);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://connect-sb-issuing.paymaya.com/token',false);

    // Basic Authentication. (Not stated in the documentation)
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + base64Auth);
    
    // This is the request body in the x-www-form-urlencoded format.
    var params = "grant_type=authorization_code&code=" + code + "&redirect_uri="+ redirect_uri;
    
    xhr.send(params);

    // Parses the response as a JSON file.
    var response = JSON.parse(xhr.responseText);
    var status = xhr.status;

    console.log();
    console.log("This is the response body:");
    console.log(response);
    console.log();
    console.log("Status " + status);

    //Returns the access token and refresh token for any requests related to the API.
    if (status == 200 && response.access_token != null && response.refresh_token != null){
        access_token = response.access_token;
        refresh_token = response.refresh_token;
        console.log("\nThe Access token has been successfully retrieved.");
    }else{
        console.log("\nThere was a problem retrieving the access token.");
        console.log("Check response object for more details on the error.");
    }
}

/**
 * To be called when access token is missing.
 */
function missingAccTok(res){
    console.log("Access token is missing.");
    console.log("Please Authorize client before commiting an action");
    res.status(400);
    res.json("Action token is missing. Please Authorize client before commiting an action.");
}

// Logs any server-side errors to the console and send 500 error code.
app.use(function (err, req, res) {
    // TODO: Add a response to the error.
    console.error("Error: " + err);
    req.status(internalServerError).send('Something broke!');
});

app.listen(port, function(){
    console.log('Server running, access the website by going to http://localhost');
});

