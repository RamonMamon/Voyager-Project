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
app.use(bodyParser.urlencoded({extended: true}));

/**
 * Sends the index.html file to the client.
 */
app.get('/', sendIndex);

app.get('/callback', retrieveCallbackInfo);


app.get('/user', function(req, res){
    if(access_token != null){
        // Make the /user call of the PayMaya API retrieving the information of the user.
        makeRequest("GET","/profile", res, false, 'Profile_Request', null, false);
    }else{
        missingAccTok(res);
    }
});

app.get('/balance', function(req, res){
    if(access_token != null){
        // Make the /balance call and send the balance to the html file.
        makeRequest("GET","/balance", res, true, 'Balance_Request', null, false)
    }else{
        missingAccTok(res);
    }
});

app.get('/transfer', function(req,res){
    if(access_token != null){
        // Initiate the transfer of money.
        var alias = req.body.alias;
        var amount = req.body.amount;
        var note = req.body.note;
        console.log(JSON.parse(req.body));

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
    }else{
        missingAccTok(res);
    }
});

app.get('/confirm', function(req,res){
    // Money Transfer
    // Purchase
    // Biller Payment
    if(access_token != null){
        var type = req.body.type;
        console.log(req.body);
        var request;
        if(type == 'transfer'){
            var alias = req.body.alias;
            request = '/transfer/' + alias + '/execute';
            makeRequest('PUT',request, res, false, 'Transfer_Request', null, false);
        }else if(type == 'purchase'){

        }else if(type == 'payment'){

        }

    }else{
        missingAccTok(res);
    }
});

app.get('/cancel', function(req,res){
    if(access_token != null){
        var type = req.query.type;
        var request;
        if(type == 'transfer'){
            var alias = req.query.alias;
            request = '/transfer/' + alias;
            makeRequest('DELETE',request, res, false, 'Transfer_Request', body, false);
        }else if(type == 'purchase'){

        }else if(type == 'payment'){

        }

    }else{
        missingAccTok(res);
    }
});

app.get('/productCatalog', function(req,res){
    if(access_token != null){
        makeRequest('GET','/shop/products', res, false, 'Retrieve_Catalog', null, false);
    }else{
        missingAccTok(res);
    }

});

app.get('/purchase', function(req,res){
    if(access_token != null){
        var body = {
            // "purchaseId":
        }
        makeRequest('GET','/shop/products', res, false, 'Retrieve_Catalog', null, false);
    }else{
        missingAccTok(res);
    }

});

app.get('/billers', function(req,res){
    if(access_token != null){
        makeRequest('GET','/billers', res, true, 'Get_Billers', null, true);
    }else{
        missingAccTok(res);
    }
});

app.get('/billPayment', function(req,res){
    if(access_token != null){
        var body =  {
            "biller": "pldt",
            "amount": {
                "currency": "PHP",
                "value": 100,
            },
            "fields": {
                "AccountNumber": "770768887403",
                "PhoneNumber": "+639399242169"
            },
            "notify": {
                "url": "http://localhost/notifyBill",
                "meta": {}
            }
        }
        makeRequest('POST','/billpayment', res, true, 'Init_billpayment', body, false);
    }else{
        missingAccTok(res);
    }
});

app.get('/payBill', function(req,res){

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
 * @param {boolean} basicAuth Determines whether or not to use basic-auth authorization or an Access token.
 */
function makeRequest(requestType, endpoint, res, isJson, requestNo, body, basicAuth){
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
    res.json(request.responseText);
    
    console.log("\nRequest Status returned as " + request.status);
    if(request.status == 200 || request.status == 201){
        console.log("Access to endpoint " + endpoint + " was successful.");
    }else{
        console.log("An error has occurred.")
        console.log("Please check the returned response on the client.");
    }
}

/**
 * Create an error response similar to the makeRequest()
 */

/**
 * Create my own way to track the transaction history of an account.
 */

function sendIndex(req,res){
    console.log('Request Type: ', req.method);
    res.status(OK);
    res.sendFile(path.join(__dirname,'./index.html'));

}

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

