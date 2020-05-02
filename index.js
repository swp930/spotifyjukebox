var port = process.env.PORT
if (port == null || port == "") {
    port = 8888
}

/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library  
var path = require('path')
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser')

var client_id = '5cdc53405b224d4fa1d1b8eef875c3d8'; // Your client id
var client_secret = 'fa990d3dd5cc491f94f38a8e57d19ebe'; // Your secret
var redirect_uri = process.env.CALLBACK_URL // Your redirect uri
if (redirect_uri == null || redirect_uri == "") {
    redirect_uri = 'http://localhost:8888/callback';
}

var access_token = "BQCCnFjKTW7icLQTnyMKEA5hlJ_R6YZFv8yTCUExTlreram1rqV9nCskrRlFo8sDqco09VyHk8nbCa9XMtArWHszlIQcWLIpiwt7OZ1zoJ_8Kg5bJz2T5NkPmauc9RBu6WNCJxxh4D1TVvHC3RIM2TanDhrPAJOIFcQ"
var access_token_2 = "BQBZGuK4bx_dEgswsrZBvFrC4K_7cHmZuOojK7JWG4b60UpOkJKtbQ0M3RVTEtKju1lIGRiqI_J8VmhJh8CUCIhtkwebDNGNw8T9arYPvjpO5oO9crwDkDaYcLBWwnLyMcwL8aOU7vsaUm7We8J2PxZSr5O_sBbUAi_ovzIrXqRbg2BHV7kBV1Y"


/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser())
    .use(bodyParser.json())

app.get('/createjukebox', function(req, res) {
    var options = {
        root: path.join(__dirname, "public")
    }
    res.sendFile('createjukebox.html', options)
})

app.get('/login', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'user-read-private user-read-email user-modify-playback-state';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        })
    );
});

app.get('/callback', function(req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    console.log(body);
                });

                // we can also pass the token to the browser to make requests from there
                res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));
            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.get('/pause', function(req, res) {
    //res.send({ "completed": true })
    console.log("Pausing")

    var options = {
        url: 'https://api.spotify.com/v1/me/player/pause',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
    };

    var options_2 = {
        url: 'https://api.spotify.com/v1/me/player/pause',
        headers: { 'Authorization': 'Bearer ' + access_token_2 },
        json: true
    };

    // use the access token to access the Spotify Web API
    request.put(options, function(error, response, body) {
        console.log(error)
        console.log(response)
        console.log(body)
    });

    request.put(options_2, function(error, response, body) {
        console.log(error)
        console.log(response)
        console.log(body)
        res.send({})
    });
})

app.get('/play', function(req, res) {
    //res.send({ "completed": true })
    console.log("Playing")

    var uris = ["spotify:track:38loOBAgDgCW4pFWyH9cey"]

    var options = {
        url: 'https://api.spotify.com/v1/me/player/play',
        headers: { 'Authorization': 'Bearer ' + access_token },
        body: {
            "uris": uris
        },
        json: true
    };

    var options_2 = {
        url: 'https://api.spotify.com/v1/me/player/play',
        headers: { 'Authorization': 'Bearer ' + access_token_2 },
        body: {
            "uris": uris
        },
        json: true
    };

    request.put(options, function(error, response, body) {
        console.log(error)
        console.log(response)
        console.log(body)
    });

    request.put(options_2, function(error, response, body) {
        console.log(error)
        console.log(response)
        console.log(body)
        res.send({})
    });
})

app.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

console.log('Listening on 8888');
app.listen(port);