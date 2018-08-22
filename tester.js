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
const BADREQUEST = 400;

// The Client Credentials required for Base64 authentication.
const client_id = "ramon-test";
const client_secret = "Oox5bUpUKKtG07lWfQWztJgWB3wazc5Su8Mz1l3tKBqTn45ohzemH1wA5ZiHrb8iDiM3Q5Yso8cazz5ue5e2Tw";
const base64Auth = base64.encode(client_id + ":" + client_secret);

const redirect_uri = "http://localhost/callback";

// These are the tokens which will be used to authenticate the client.
var access_token;
var refresh_token;

var kycSubmissionID;

//These are static directories for the webpage to access.
app.use(express.static(__dirname));
app.use(bodyParser.json());

/**
 * Sends the index.html file to the client.
 */
app.get('/', function (req,res){
    console.log('Request Type: ', req.method);
    res.status(OK);
    res.sendFile(path.join(__dirname,'./index.html'));

});

/**
 * Retrieves an access token without the user having to reauthenticate himself.
 */
function refresh(){
    if(refresh_token != null){
        var params = "grant_type=refresh_token&refresh_token=" + refresh_token;
        authenticate(refresh_token, params)
    }
}

/**
 * Authenticates the user and returns a response object containing the refresh and access tokens.
 * @param {*} code 
 * @param {*} params 
 */
function authenticate(code, params){
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://connect-sb-issuing.paymaya.com/token',false);

    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + base64Auth);
    
    console.log("Using Code/Refresh Token: " + code);
    
    xhr.send(params);
    return xhr;
}

/**
 * This is the endpoint specified for the redirect_uri and will be used to
 * retrieve all of the tokens required for authentication (Access and Refresh Tokens).
 */
app.get('/callback', function(req,res){
    res.sendFile(path.join(__dirname,'./index.html'));

    var code = req.query.code

    var params ="grant_type=authorization_code&code=" + code + "&redirect_uri="+ redirect_uri;
    var xhr = authenticate(code, params);
    // Parses the response as a JSON file.
    var response = JSON.parse(xhr.responseText);
    var status = xhr.status;

    console.log();
    console.log("This is the response body:");
    console.log(response);
    console.log();
    console.log("Status " + status);

    //Returns the access token and refresh token for any requests related to the API.
    if (status == OK && response.access_token != null && response.refresh_token != null){
        access_token = response.access_token;
        refresh_token = response.refresh_token;
        console.log("\nThe Access token and Refresh token has been successfully retrieved.");
    }else{
        console.log("\nThere was a problem retrieving the access token.");
        console.log("Check response object for more details on the error.");
    }
});


/**
 * This Endpoint requests and returns the basic info of the user.
 */
app.get('/user', function(req, res){
    // Make the /user call of the PayMaya API retrieving the information of the user.
    makeRequest("GET","/profile", res, 'Profile_Request', null, false);
});

/**
 * This Endpoint is used to retrieve the current balance of the user.
 */
app.get('/balance', function(req, res){
    // Make the /balance call and send the balance to the html file.
    makeRequest("GET","/balance", res, 'Balance_Request', null, false)
});

/**
 * This Endpoint will initiate a request to transfer money to the specified User through
 * his alias or phone number.
 */
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

    makeRequest('POST','/transfer', res, 'Transfer_Request', body, false);
});

/**
 * This makes a request to the PayMaya external API that confirms either an existing transfer
 * or an existing payment.
 */
app.put('/confirm', function(req,res){
    var type = req.body.type;
    var request;
    if(type == 'transfer'){
        var alias = req.body.alias;
        console.log('Confirming transfer request with the ID: ' + alias);
        request = '/transfer/' + alias + '/execute';
        makeRequest('PUT',request, res, 'Transfer_Request', null, false);
    }else if(type == 'payment'){
        // Executes a bill payment.
        var billerID = req.body.billerID;
        console.log('Confirming payment to the Biller ID: ' + billerID);
        request = '/billpayment/' + billerID + '/execute';
        makeRequest('POST', request,res,'Payment_Request_Confirmation', null, false);
    }
});

/**
 * Cancels an initiated Transaction.
 */
app.post('/cancel', function(req,res){
    var alias = req.body.alias;
    var request = '/transfer/' + alias;        
    makeRequest('DELETE',request, res, 'Transfer_Request', null, false);
});

/**
 * Returns the products from the PayMaya Shop.
 */
app.get('/productCatalog', function(req,res){
    makeRequest('GET','/shop/products', res, 'Retrieve_Catalog', null, false);
});

/**
 * Makes a purchase of a product from the shop.
 */
app.post('/purchase', function(req,res){
    var body = {
        "purchaseId": req.body.purchaseID,
        "productId": req.body.productID
    }
    makeRequest('POST','/shop/purchase', res, 'Retrieve_Catalog', body, false);

});

// Requests and sends the list of all the billers.
app.get('/billers', function(req,res){
    makeRequest('GET','/billers', res, 'Get_Billers', null, true);
});

// Makes a P100 payment to a biller.
app.post('/payBill', function(req,res){
    var billerID = req.body.billerID
    var body =  {
        "biller": billerID,
        "amount": {
            "currency": "PHP",
            "value": 100,
        },
        "fields": {
            "DueDate": "2016-07-10",
            "AccountNumber": "30099492"
        },
        "notify": {
            "url": "https://example.com/notifyBill",
            "meta": {
                "id":"bill123",
                "special_token": "abcdefghi"
            }
        }
    }
    makeRequest('POST','/billpayment', res, 'Init_billpayment', body, false);
});

/**
 * Makes a request for the required fields for the specified profile.
 */
app.get('/getFields',function(req,res){
    // Change profile type when necessary.
    var profile = "KYC1";
    makeRequest('GET','/kyc/fields?profile=' + profile, res, 'Get_Fields', null, true);
});

app.get('/uploadFile',function(req,res){
    //TODO: Not working.
    var body = {
        "fileName":"./testfile.txt"
    }
    makeRequest('POST','/kyc/upload', res, 'Upload_Docs', body, false);
});

/**
 * Submits the required details for KYC1
 */
app.get('/submit', function(req,res){
    //TODO: Not working.
    var body = {
        "work": {
            "employmentDetail":"Interning at Voyager Innovations",
            "governmentId": "./testfile.txt",
            "incomeSource": "Parents",
            "otherIncomeSource": "",
            "workNature": "Intern"
        },
        "personal":{
            "birthDate":"1999-03-19",
            "birthPlace":"Manila",
            "firstName":"Ramon",
            "governmentIdImgLoc":"./testfile.txt",
            "lastName":"Catane",
            "middleName":"G",
            "nationality":"PH"
        },
        "address":{
            "permanentAddress":"Manila Philippines",
            "presentAddress":"Manila Philippines"
        }
    }
    makeRequest('POST','/kyc/KYC1', res, 'Submit_Details', body, false);
})

app.get('/status', function(req,res){
    var request = "kyc/status/" + kycSubmissionID;
    makeRequest('GET',request, res, 'Get_Status', null, false);
})

/**
 * This function will be used to make any request to the PayMaya Sandbox API. 
 * 
 * It is used to take a request from a client which will then make a request to the PayMaya wallet API. 
 * Once a response is received from the API, the same response will be sent back to the client as a 
 * JSON object.
 * @param {String} requestType Is the type of request made to the url.
 * @param {String} endpoint Is the destination for the request of a given URL.
 * @param {Object} res Is the response object.
 * @param {String} requestNo Will be used to verify and retrieve request information by PayMaya
 * @param {Object} body Is the Request body.
 * @param {boolean} basicAuth Determines whether or not to use basic-auth authorization. If false, an access token will be used instead.
 */
function makeRequest(requestType, endpoint, res, requestNo, body, basicAuth){
    // Checks if the User is authenticated with an access token.
    if(access_token != null){
        refresh();
        var request = new XMLHttpRequest();
        request.open(requestType, "https://api-test.paymaya.com/external-api-sandbox/v1/" + endpoint,false);
        if(body!= null){
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
        }else if (request.status == 204){
            console.log("The request was successful, but returned with an empty response.");
        }else{
            console.log("An error has occurred.")
            console.log("Please check the returned response on the client.");
        }
    }else{
        missingAccTok(res);
    }
}

/**
 * To be called when access token is missing.
 */
function missingAccTok(res){
    console.log("Access token is missing.");
    console.log("Please Authorize client before commiting an action");
    res.status(BADREQUEST);
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

