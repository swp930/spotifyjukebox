//var regex_temp = /\?jid=(\S*)/
//var arr = window.location.search.match(regex_temp)
var song_results = []
var intervalVar
var lastCalled

var regexJID = /[\S]*\?jid=([\dA-z]*[-][\dA-z]*[-][\dA-z]*)/
var regexSID = /[\S]*sid=([\dA-z]*)/

var jidGlobal = window.location.search.match(regexJID)[1]
console.log("jidGlobal is: " + jidGlobal)
var sidGlobalArr = window.location.search.match(regexSID)
var sidFromUrl
if (sidGlobalArr) {
    sidFromUrl = sidGlobalArr[1]
    console.log("sidFromUrl is: " + sidFromUrl)
    setCookie("sid", sidFromUrl, 30)
}
document.getElementById("jid").innerHTML = jidGlobal
var isOwner = false

var xhr = new XMLHttpRequest();
xhr.open("POST", "/registerjukebox", true);
xhr.setRequestHeader("Content-Type", "application/json")
xhr.onreadystatechange = function() { // Call a function when the state changes.
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        console.log("Played ")
    }
}
xhr.send(JSON.stringify({
    "jid": jidGlobal
}));


checkinWithServer()
checkinDuration()
var rt = document.getElementById("remaining_time")
window.addEventListener("beforeunload", (event) => handleFunction(event));

function addUriToQueue(songid) {

    var arr = songid.split("&&")
    var uri = arr[0]
    var songName = arr[1]
    var duration = arr[2]
    var url = "/addtoqueue?jid=" + jidGlobal + "&uri=" + uri + "&songname=" + songName + "&duration=" + duration
    var xhr = new XMLHttpRequest()
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var response = JSON.parse(xhr.response)
            console.log(response)
        }
    }
    xhr.send()
}

function checkinDuration() {
    var url = "/checkinduration?jid=" + jidGlobal
    console.log(url)
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var response = JSON.parse(xhr.response)
            console.log(response)
            var remaining_time
            if (response.item) {
                console.log(response.item.duration_ms)
                console.log(response.progress_ms)
                remaining_time = response.item.duration_ms - response.progress_ms
            }
            console.log(remaining_time)
            document.getElementById("remaining_time").innerHTML = Math.round(parseInt(remaining_time) / 1000)
            clearInterval(intervalVar)
            lastCalled = (new Date()).getTime()
            intervalVar = setInterval(function() {
                decrementTime()
            }, 1000);
        }
    }
    xhr.send()
}

function checkinWithServer() {
    var xhr = new XMLHttpRequest();
    var urlCheckSession = "/checksession?jid=" + jidGlobal
    var sidCS = getCookie("sid")
    if (sidCS) {
        urlCheckSession += "&sid=" + sidCS
    }
    xhr.open("GET", urlCheckSession, true);
    xhr.onreadystatechange = function() { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var response = JSON.parse(xhr.response)
            console.log("URL check session")
            console.log(response)
            document.getElementById("loggedin").innerHTML = response.loggedin
            document.getElementById("injukebox").innerHTML = response.injukebox
            console.log("Current queue")
            console.log(response.queue)
            constructQueueView(response.queue)
            if (!response.loggedin && getCookie("sid").length > 0) {
                console.log("Shouldnt have cookie")
                console.log("Should refresh")
                window.location.href = "/jukebox?jid=" + jidGlobal
                    //(getCookie("sid") !== '' || getCookie("sid") != null)
            }
            //window.location.href = "/jukebox?jid=" + jidGlobal
        }
    }
    xhr.send();
}

function connectToJukeBox() {
    if (getCookie("sid") == null || getCookie("sid") == "") {
        alert("Please login first")
    } else {
        var connectObj = {
            "message_type": "register",
            "jid": jidGlobal,
            "sid": getCookie("sid")
        }
        connection.send(JSON.stringify(connectObj))
    }
}

function constructQueueView(queue) {
    var container = document.getElementById("queue")
    container.innerHTML = ""
    for (var i = 0; i < queue.length; i++) {
        var div = document.createElement("div")
        div.innerHTML = queue[i].songname
        div.id = i
        div.style = "border: 1px solid black;"
        container.appendChild(div)
    }
}

function constructResultsView(songs) {
    var container = document.getElementById("search_song_results")
    container.innerHTML = ""
    for (var i = 0; i < songs.length; i++) {
        var songName = songs[i].name + " - " + songs[i].artists
        var duration = songs[i].duration
        var div = document.createElement("div")
        div.innerHTML = songName
        div.id = i
        div.style = "border: 1px solid black;"
        container.appendChild(div)
        var button = document.createElement("button")
        button.innerHTML = "Add this song"
        button.id = songs[i].uri + "&&" + songName + "&&" + duration
        button.onclick = function(event) {
            addUriToQueue(event.srcElement.id)
            container.innerHTML = ""
        }
        div.appendChild(button)
    }
}

function decrementTime() {
    var time = parseInt(rt.innerHTML)
    var currTime = (new Date()).getTime()
    var diff = Math.round((currTime - lastCalled) / 1000)
    time = time - diff
    lastCalled = currTime
    var displayTime = 0
    rt.innerHTML = Math.max(time, displayTime)
    if (time <= 0) {
        clearInterval(intervalVar)
        if (isOwner) {
            skipSong()
        }
    }
}

function handleSearchKey(event) {
    if (event.key == "Enter") {
        searchForSong()
    }
}

function getCookie(cookieToRetrieve) {
    var withEquals = cookieToRetrieve + "="
    var cookie = document.cookie
    var indexVal = cookie.indexOf(withEquals)
    if (indexVal == -1)
        return ""
    var indexOfSemi = cookie.indexOf(";", indexVal)
    if (indexOfSemi == -1)
        indexOfSemi = cookie.length
    var res = cookie.substring(indexVal + withEquals.length, indexOfSemi)
    return res
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

function handleFunction(event) {
    var connectObj = {
        "message_type": "closing",
        "jid": jidGlobal,
        "sid": getCookie("sid")
    }
    setCookie("sid", "", -2)
    connection.send(JSON.stringify(connectObj))
}

function login() {
    console.log("Logging in")
    var sid = getCookie("sid")
    console.log(sid)
    if (sid == "") {
        //sid = guid()
        //setCookie("sid", sid, 30)
        var xhr = new XMLHttpRequest();
        var url = "/login?jid=" + jidGlobal
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function() { // Call a function when the state changes.
            if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                var response = JSON.parse(xhr.response)
                console.log(response)
                var redirectURL = response.url
                window.location.href = redirectURL
            }
        }
        xhr.send();
    }
    console.log("sid is: " + sid)
}

function logout() {
    const url = 'https://www.spotify.com/logout/'
    const spotifyLogoutWindow = window.open(url, 'Spotify Logout', 'width=700,height=500,top=40,left=40')
    var connectObj = {
        "message_type": "closing",
        "jid": jidGlobal,
        "sid": getCookie("sid")
    }
    setCookie("sid", "", -1)
    connection.send(JSON.stringify(connectObj))
    setTimeout(() => {
            spotifyLogoutWindow.close()
            window.location.href = "/jukebox?jid=" + jidGlobal
        }, 500)
        //checkinWithServer()

}

function playJukeBox() {
    console.log("Play Jukebox")
    var url = "/playjukebox?jid=" + arr[1] + "&sid=" + getCookie("sid")
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var response = JSON.parse(xhr.response)
            console.log(response)
        }
    }
    xhr.send()
}

function playSong() {
    console.log("Play song")
    var url = "/playqueue?jid=" + jidGlobal
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var response = JSON.parse(xhr.response)
            console.log(response)
        }
    }
    xhr.send()
}

function searchChange() {
    var container = document.getElementById("search_song_results")
    container.innerHTML = ""
}

function searchForSong() {
    var searchVal = document.getElementById("search_song").value
    console.log(searchVal)

    var xhr = new XMLHttpRequest();
    var url = "/searchforsong?query=" + searchVal + "&sid=" + getCookie("sid")
    xhr.open("GET", url, true)
    xhr.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE || this.status === 200) {
            var res = JSON.parse(xhr.response)
            var songs = []
            for (var i = 0; i < res.length; i++) {
                var artists = ""
                for (var j = 0; j < res[i].artists.length; j++) {
                    artists += res[i].artists[j].name
                    if (j != res[i].artists.length - 1)
                        artists += ", "
                }
                var song = {
                    "name": res[i].name,
                    "uri": res[i].uri,
                    "artists": artists,
                    "duration": res[i].duration_ms
                }
                songs.push(song)
            }
            constructResultsView(songs)
        }
    }
    xhr.send()
}

function setCookie(key, value, days) {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 3600 * 1000))
    var expiryDate = "expires=" + date.toUTCString();
    document.cookie = key + "=" + value + ";" + expiryDate + ";path=/";
}

function skipSong() {
    console.log("Skip song")
    var xhr = new XMLHttpRequest();
    var url = "/skipsong?jid=" + jidGlobal
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var response = JSON.parse(xhr.response)
            console.log(response)
        }
    }
    xhr.send()
}

var HOST = location.origin.replace(/^http/, 'ws')
var connection = new WebSocket(HOST);

connection.onopen = function() {
    console.log('Websocket Client Connected')
}

connection.onmessage = function(message) {
    console.log("message is ")
    console.log(message)
    if (message.data) {
        var data = JSON.parse(message.data)
        switch (data.message_type) {
            case 'register_response':
                document.getElementById("injukebox").innerHTML = data.injukebox
                isOwner = data.isowner
                checkinDuration()
                break
            case 'queue_response':
                console.log('queue_response')
                console.log(data.queue)
                constructQueueView(data.queue)
                if (data.queue.length <= 0) {
                    clearInterval(intervalVar)
                    document.getElementById("remaining_time").innerHTML = ""
                        //skipSong()
                }
                break
            case 'length_response':
                document.getElementById("remaining_time").innerHTML = Math.round(parseInt(data.song_length) / 1000)
                clearInterval(intervalVar)
                lastCalled = (new Date()).getTime()
                intervalVar = setInterval(function() {
                    decrementTime()
                }, 1000);
                break
            case 'play_error':
                console.log(data.error)
                if (data.error.reason == "NO_ACTIVE_DEVICE") {
                    alert("No active device found, please play a song in the background and try again")
                } else {
                    alert(data.error.message)
                }
                break
            case 'register_error':
                console.log(data.message)
                alert(data.message)
                break
            default:
                console.log(data)
                break
        }
    }
}