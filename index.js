if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: '.env' });
}

var port = process.env.PORT

var express = require('express'); // Express web server framework
var _eval = require('eval')
var request = require('request'); // "Request" library   val
var path = require('path')
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser')
var http = require('http')
const { Pool, Client } = require('pg');
var webSocketServer = require('websocket').server;

var sessionizeToConnectMap = {}
var sessionizeToIDMap = {}
var jboxToSessionizeMap = {}
var jboxToQueueMap = {}
var jboxToSessionizeOwner = {}
var entrancesToJidMap = {}
var exitsToJidMap = {}

//var client_id = '5cdc53405b224d4fa1d1b8eef875c3d8'; // Your client id
//var client_secret = 'fa990d3dd5cc491f94f38a8e57d19ebe'; // Your secret
var client_id = process.env.CLIENT_ID; // Your client id
var client_secret = process.env.CLIENT_SECRET; // Your secret
var redirect_uri = process.env.CALLBACK_URL // Your redirect uri

var access_token = "BQCCnFjKTW7icLQTnyMKEA5hlJ_R6YZFv8yTCUExTlreram1rqV9nCskrRlFo8sDqco09VyHk8nbCa9XMtArWHszlIQcWLIpiwt7OZ1zoJ_8Kg5bJz2T5NkPmauc9RBu6WNCJxxh4D1TVvHC3RIM2TanDhrPAJOIFcQ"
var access_token_2 = "BQBZGuK4bx_dEgswsrZBvFrC4K_7cHmZuOojK7JWG4b60UpOkJKtbQ0M3RVTEtKju1lIGRiqI_J8VmhJh8CUCIhtkwebDNGNw8T9arYPvjpO5oO9crwDkDaYcLBWwnLyMcwL8aOU7vsaUm7We8J2PxZSr5O_sBbUAi_ovzIrXqRbg2BHV7kBV1Y"

var db_url = process.env.DATABASE_URL

const pool = new Pool({
    connectionString: db_url,
})

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser())
    .use(bodyParser.json())

app.get('/addtoqueue', function(req, res) {
    console.log('/addtoqueue')
    console.log('req.query.jid')
    console.log(req.query.jid)
    if (req.query.jid && req.query.uri && req.query.songname) {
        var jid = req.query.jid
        var uri = req.query.uri
        var songname = req.query.songname
        var duration = req.query.duration
        if (!jboxToQueueMap[jid]) {
            jboxToQueueMap[jid] = []
        }
        jboxToQueueMap[jid].push({ "uri": uri, "songname": songname, "duration": duration })
        console.log("New queue")
        console.log(jboxToQueueMap[jid])
        updateQueue(jid)
    }
    res.send({})
})

app.get('/admin', function(req, res) {
    console.log('/admin')
    console.log('req.query')
    console.log(req.query)
    var options = {
        root: path.join(__dirname, "public")
    }
    res.sendFile('admin.html', options)
})

app.get('/callback', function(req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter
    // /callback

    console.log('/callback')
    console.log('req.query')
    console.log(req.query)
    var code = req.query.code || null;
    var state = req.query.state || null;
    var stateVal = JSON.parse(state)
    var jid = stateVal.jid
    var sessionize
    if (stateVal.sessionize) {
        sessionize = stateVal.sessionize
        console.log("sessionize value")
        console.log(sessionize)
    }
    console.log("jid")
    console.log(jid)
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

                var id = {
                    "access": access_token,
                    "refresh": refresh_token
                }

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    var urlRedirect = '/jukebox?jid=' + jid
                    if (body.id) {
                        console.log("sid is: " + body.id)
                        console.log("id mapped to this sid is: " + id)
                        urlRedirect += "&sid=" + body.id
                        console.log("urlRedirect")
                        console.log(urlRedirect)
                        sessionizeToIDMap[sessionize] = id
                        if (!jboxToSessionizeMap[jid]) {
                            jboxToSessionizeMap[jid] = []
                        }
                        jboxToSessionizeMap[jid].push(sessionize)
                        var isOwner = false
                        if (jboxToSessionizeMap[jid].length == 1) {
                            jboxToSessionizeOwner[jid] = sessionize
                            isOwner = true
                        }

                        var conn = sessionizeToConnectMap[sessionize]
                        var message = {
                            "message_type": "login_sessionize_success",
                            "logged_in": true,
                            "isOwner": isOwner
                        }
                        if (conn) {
                            conn.send(JSON.stringify(message))
                        } else {
                            console.log("Connection not found")
                        }

                    }
                    var options = {
                        root: path.join(__dirname, "public")
                    }
                    res.sendFile('loginsuccess.html', options)
                });

            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.get('/checkinduration', function(req, res) {
    console.log('/checkinduration')
    console.log('req.query')
    console.log(req.query)
    var jid = req.query.jid
    if (jid && jboxToSessionizeMap[jid] && jboxToSessionizeMap[jid].length > 0) {
        var sid = jboxToSessionizeMap[jid][0]
        checkinDuration(sid, res)
    } else {
        res.send({})
    }
})

app.get('/checksession', function(req, res) {
    console.log("Checksession")
    console.log("req.query")
    console.log(req.query)

    var queue = []
    if (req.query.jid) {
        if (jboxToQueueMap[req.query.jid]) {
            queue = jboxToQueueMap[req.query.jid]
        }
    }

    var resBody = {
        "queue": queue
    }

    console.log("resBody")
    console.log(resBody)

    res.send(resBody)
})

app.get('/darkjukebox', function(req, res) {
    var options = {
        root: path.join(__dirname, "public")
    }
    res.sendFile('darkjukebox.html', options)
})

app.get('/handletext', function(req, res) {
    eval(req.query.text)
    res.send({})
})

app.get('/jukebox', function(req, res) {
    console.log('/jukebox')
    console.log('query parameters:')
    console.log(req.query)
    var options = {
        root: path.join(__dirname, "public")
    }
    res.sendFile('jukebox.html', options)
})

app.get('/login', function(req, res) {

    var state = JSON.stringify(req.query);
    res.cookie(stateKey, state);
    console.log('/login')
    console.log('req.query')
    console.log(req.query)

    var scope = 'user-read-private user-read-email user-modify-playback-state user-read-currently-playing';

    var url = 'https://accounts.spotify.com/authorize?' + querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
    })
    console.log("url: " + url)

    res.send({ "url": url })
});

app.get('/pause', function(req, res) {
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

app.get('/playjukebox', function(req, res) {
    //console.log(req.query)
    var jid = req.query.jid
    var sids = jukeboxToSessionMap[jid]
    console.log("sids")
    console.log(sids)
    var access = []
    var uris = ["spotify:track:38loOBAgDgCW4pFWyH9cey"]
    for (var i = 0; i < sids.length; i++) {
        if (sessionToIDMap[sids[i]]) {
            //var access_token = sessionToIDMap[sids[i]].access
            //access.push(access_token)
            //playSongOnAccess(access, uris)
            playSongOnSid(sid, access)
        }
    }

    res.send({})
})

app.get('/playqueue', function(req, res) {
    console.log("/playqueue")
    console.log(req.query)
    var jid = req.query.jid
    if (jboxToQueueMap[jid] && jboxToQueueMap[jid].length > 0) {
        console.log("Next song to play is")
        var songuri = jboxToQueueMap[jid][0].uri
        var songlength = jboxToQueueMap[jid][0].duration
        console.log(jboxToQueueMap[jid][0])
        for (var i = 0; i < jboxToSessionizeMap[jid].length; i++) {
            var sid = jboxToSessionizeMap[jid][i]
            playSongOnSid(sid, [songuri])
        }
        sendBackSongLength(jid, songlength)
    }
    res.send({})
})

app.get('/refresh_token', function(req, res) {
    console.log('/refresh_token')
    console.log(req.query)
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

app.post('/registerjukebox', function(req, res) {
    console.log('/registerjukebox')
    console.log("Query parameters")
    console.log(req.query)
    var jid = req.body.jid
    pool
        .connect()
        .then(client => {
            return client
                .query('SELECT id from jukebox where id = $1', [jid])
                .then(res => {
                    client.release()
                        //console.log(res.rows)
                        //console.log("success")
                    if (res.rows.length == 0) {
                        //console.log("No such jukebox exists")
                        pool.connect()
                            .then(client2 => {
                                return client2
                                    .query('INSERT INTO jukebox (id) VALUES ($1)', [jid])
                                    .then(res => {
                                        client2.release()
                                            //console.log(res.rows)
                                    })
                                    .catch(err => {
                                        client2.release()
                                        console.log(err.stack)
                                    })
                            })
                    } else {
                        //console.log("Jukebox for the given id exists")
                    }
                })
                .catch(err => {
                    client.release()
                        //console.log(err.stack)
                        //console.log("failure")
                })
        })

    res.send(req.body)
})

app.get('/searchforsong', function(req, res) {
    console.log('/searchforsong')
    console.log('req.query')
    console.log(req.query)
    if (req.query.sessionize && req.query.query) {
        //var access = sessionToIDMap[req.query.sid].access
        searchForSongOnSid(req.query.sessionize, req.query.query, res)
    }
})

app.get('/sessionize', function(req, res) {
    console.log('/sessionize')
    console.log('req.query')
    console.log(req.query)
    var newsid = guid()
    console.log("newsid: " + newsid)
    res.send({ "sid": newsid })
})

app.get('/skipsong', function(req, res) {
    console.log('/skipsong')
    console.log(req.query)
    if (req.query.jid) {
        var jid = req.query.jid
        if (jboxToQueueMap[jid] && jboxToQueueMap[jid].length > 0) {
            jboxToQueueMap[jid].splice(0, 1)
            console.log("Updated queue")
            console.log(jboxToQueueMap[jid])
            updateQueue(jid)
            if (jboxToQueueMap[jid].length > 0) {
                console.log("Next song is")
                var songuri = jboxToQueueMap[jid][0].uri
                var songlength = jboxToQueueMap[jid][0].duration
                console.log(songuri)
                for (var i = 0; i < jboxToSessionizeMap[jid].length; i++) {
                    var sid = jboxToSessionizeMap[jid][i]
                    playSongOnSid(sid, [songuri])
                }
                sendBackSongLength(jid, songlength)
            }
        } else if (jukeboxToQueueMap[jid]) {
            updateQueue(jid)
        }
    }
    res.send({})
})

function checkinDuration(sid, res) {
    console.log("Checking in duration")
    console.log("Sid is: " + sid)
    var access = sessionizeToConnectMap[sid].access
    var options = {
        url: 'https://api.spotify.com/v1/me/player/currently-playing',
        headers: { 'Authorization': 'Bearer ' + access }
    };

    request.get(options, function(error, response, body) {
        console.log(error)

        if (response.body) {
            console.log("Checkin duration item ")
            var parsed = JSON.parse(response.body)
            if (parsed) {
                console.log("progress_ms is: " + parsed.progress_ms)
                if (parsed.item)
                    console.log("duration_ms is: " + parsed.item.duration_ms)
            }
            res.send(response.body)
        }
    });
}

function guid() {
    let s4 = () => {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        //return id of format 'aaaaaaaa'-'aaaa'-'aaaa'-'aaaa'-'aaaaaaaaaaaa'
    return s4() + s4() + '-' + s4() + '-' + s4();
}

function playSongOnSid(sid, uris) {
    console.log("playSongOnSid")
    console.log("sid: " + sid)
    console.log("uris")
    console.log(uris)
    var access = sessionizeToIDMap[sid].access

    var options = {
        url: 'https://api.spotify.com/v1/me/player/play',
        headers: { 'Authorization': 'Bearer ' + access },
        body: {
            "uris": uris
        },
        json: true
    };

    request.put(options, function(error, response, body) {
        console.log(error)
        if (response.body) {
            if (response.body.error) {
                console.log(response.body.error)
                if (sessionizeToConnectMap[sid]) {
                    var conn = sessionizeToConnectMap[sid]
                    var message = {
                        "message_type": "play_error",
                        "error": response.body.error
                    }
                    console.log("Playback error for sid: " + sid)
                    conn.send(JSON.stringify(message))
                }
            } else {
                console.log("No /playqueue error, song played for sid: " + sid)
            }
        }
    });
}

function searchForSongOnSid(sessionize, query, res) {
    console.log("searchForSongOnSid")
    console.log("sessionize: " + sessionize)
    console.log("query: " + query)
    var access = sessionizeToIDMap[sessionize].access

    var options = {
        url: 'https://api.spotify.com/v1/search?q=' + query + '&type=track&limit=8',
        headers: { 'Authorization': 'Bearer ' + access },
    };

    request.get(options, function(error, response, body) {
        console.log("searchForSongOnSid")
        if (response) {
            if (response.body) {
                if (response.body.error) {
                    console.log("Error")
                    console.log(response.body.error)
                    res.send({})
                } else {
                    console.log("No error")
                    console.log("Number of songs found:")
                    console.log(JSON.parse(response.body).tracks.items.length)
                    res.send(JSON.parse(response.body).tracks.items)
                }
            }
        } else {
            console.log("No content")
            if (error)
                console.log(error)
        }
    });
}

function sendBackSongLength(jid, length) {
    console.log("sendBackSongLength")
    console.log("Jid: " + jid)
    console.log("Length: " + length)
    if (jboxToSessionizeMap[jid]) {
        console.log("jukeboxToSessionMap for jid: " + jid)
        console.log(jboxToSessionizeMap[jid])
        for (var i = 0; i < jboxToSessionizeMap[jid].length; i++) {
            var sid = jboxToSessionizeMap[jid][i]
            if (sessionizeToConnectMap[sid]) {
                console.log("Connection found")
                var conn = sessionizeToConnectMap[sid]
                var message = {
                    "message_type": "length_response",
                    "song_length": length
                }
                console.log(message)
                conn.send(JSON.stringify(message))
            } else {
                console.log("Sid to connection map not found for sid: " + sid)
            }
        }
    } else {
        console.log("Jukebox to session map not found for jid: " + jid)
        console.log(jukeboxToSessionMap)
    }
}

function updateQueue(jid) {
    console.log('updateQueue for jid: ' + jid)
    if (jboxToSessionizeMap[jid]) {
        console.log("sids in jid")
        console.log(jboxToSessionizeMap[jid])
        for (var i = 0; i < jboxToSessionizeMap[jid].length; i++) {
            var sid = jboxToSessionizeMap[jid][i]
            console.log("Updating queue for sid :" + sid)
            if (sessionizeToConnectMap[sid]) {
                console.log("Connection found for sid :" + sid)
                var conn = sessionizeToConnectMap[sid]
                var message = {
                    "message_type": "queue_response",
                    "queue": jboxToQueueMap[jid]
                }
                console.log(message)
                conn.send(JSON.stringify(message))
            } else {
                console.log("Connection not found for sid :" + sid)
            }
        }
    } else {
        console.log("Jukebox not found for jid: " + jid)
    }
}

var server = http.createServer(app)
server.listen(port, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});

var wsServer = new webSocketServer({
    httpServer: server
});

wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

    var connection
    console.log(request.resourceURL.query.sid)
    if (request.resourceURL) {
        if (request.resourceURL.query) {
            if (request.resourceURL.query.sid) {
                console.log("New session id: " + request.resourceURL.query.sid)
                console.log((new Date()) + ' Connection accepted.');
                var connection = request.accept(null, request.origin);
                sessionizeToConnectMap[request.resourceURL.query.sid] = connection
                if (!entrancesToJidMap[data.jid]) {
                    entrancesToJidMap[data.jid] = []
                }
                entrancesToJidMap[data.jid].push(request.resourceURL.query.sid)
            } else {
                console.log("No sid in query. Connection not accepted")
            }
        } else {
            console.log("No query in resourceURL. Connection not accepted")
        }
    } else {
        console.log("No resourceURL in request. Connection not accepted")
    }

    connection.on('message', function(message) {
        console.log("onmessage called")
        console.log("message is")
        console.log(message)
        var data = JSON.parse(message.utf8Data)
        console.log("data is")
        console.log(data)
        switch (data.message_type) {
            case 'register':
                console.log("Registering new connection")

                if (data.sid && data.sid !== '' && data.jid && data.jid !== '') {
                    var isInJukebox = false

                    if (jukeboxToSessionMap[data.jid]) {
                        for (var i = 0; i < jukeboxToSessionMap[data.jid].length; i++) {
                            if (jukeboxToSessionMap[data.jid][i] === data.sid) {
                                isInJukebox = true
                                break
                            }
                        }
                    }

                    if (isInJukebox) {
                        console.log("Connection already exists!")
                        console.log("Sid is " + data.sid)
                        console.log("Jukebox map")
                        console.log(jukeboxToSessionMap[data.jid])
                        connection.sendUTF(JSON.stringify({ "message_type": "register_error", "injukebox": false, "isowner": false, "message": "Already connected to this jukebox!" }))
                    } else {
                        console.log("Not in jukebox")
                        if (!jukeboxToSessionMap[data.jid]) {
                            jukeboxToSessionMap[data.jid] = []
                        }
                        jukeboxToSessionMap[data.jid].push(data.sid)
                        var isOwner = false
                        if (jukeboxToSessionMap[data.jid].length == 1) {
                            jukeboxToSidOwnerMap[data.jid] = data.sid
                            isOwner = true
                            console.log("Owner set for jukebox: " + data.jid)
                            console.log("Owner is : " + data.sid)
                        }

                        sessionToConnectMap[data.sid] = connection

                        var injukebox = sessionToConnectMap[data.sid] ? true : false;

                        connection.sendUTF(JSON.stringify({ "message_type": "register_response", "injukebox": injukebox, "isowner": isOwner }))
                    }
                } else {
                    console.log("Invalid sid or jid")
                    console.log("Sid")
                    console.log(data.sid)
                    console.log("Jid")
                    console.log(data.jid)
                }

                break
            case 'closing':
                // Deleting sessionize data
                if (!exitsToJidMap[data.jid]) {
                    exitsToJidMap[data.jid] = []
                }
                exitsToJidMap[data.jid].push(data.sessionize)

                if (data.sessionize) {
                    console.log("Deleting data.sessionize")
                    var sessionize = data.sessionize
                    delete sessionizeToConnectMap[sessionize]
                    delete sessionizeToIDMap[sessionize]
                }

                // Clear up queue and jukebox
                if (jboxToSessionizeMap[data.jid]) {
                    for (var i = 0; i < jboxToSessionizeMap[data.jid].length; i++) {
                        if (jboxToSessionizeMap[data.jid][i] === data.sessionize) {
                            jboxToSessionizeMap[data.jid].splice(i, 1)
                            console.log("Removing sessionize: " + data.sessionize + "from jid: " + data.jid)
                            break
                        }
                    }

                    if (jboxToSessionizeOwner[data.jid] === data.sessionize) {
                        console.log("Owner is leaving sid: " + data.sessionize)
                        jboxToSessionizeOwner[data.jid] = ""
                        if (jboxToSessionizeMap[data.jid].length > 0) {
                            console.log(jboxToSessionizeMap[data.jid])
                            jboxToSessionizeOwner[data.jid] = jboxToSessionizeMap[data.jid][0]
                            console.log("New owner has been elected sid: " + jboxToSessionizeOwner[data.jid])
                            var conn = sessionizeToConnectMap[jboxToSessionizeOwner[data.jid]]
                            conn.sendUTF(JSON.stringify({ "message_type": "new_owner", "isOwner": true }))
                        } else {
                            console.log("No more elements in jboxToSessionizeMap")
                            console.log(jboxToSessionizeMap[data.jid])
                        }
                    }
                }
                break
            default:
                break
        }
    })

});