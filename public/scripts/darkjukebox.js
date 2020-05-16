var song_results = []
var intervalVar
var lastCalled

var sidFromSessionize = ""
var isLoggedIn = false
var isOwner = false

var HOST = location.origin.replace(/^http/, 'ws')
var connection

var progress_bar = document.getElementById("remaining_time_progress")
var totalTime
var remainingTime

var regexJID = /[\S]*\?jid=([\dA-z]*[-][\dA-z]*[-][\dA-z]*)/
var jidGlobal = window.location.search.match(regexJID)[1]
console.log("jidGlobal is: " + jidGlobal)

checkinWithServer()
checkinDuration()

window.onload = function() {
    console.log("window.onload")
    var xhr = new XMLHttpRequest();
    var url = "/sessionize"
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var response = JSON.parse(xhr.response)
            console.log(response)
            if (response.sid) {
                sidFromSessionize = response.sid
                console.log("New session id is: " + sidFromSessionize)
                var urlAddition = "?sid=" + sidFromSessionize
                if (jidGlobal) {
                    urlAddition += "&jid=" + jidGlobal
                }
                HOST += urlAddition
                connection = new WebSocket(HOST);
                connection.onopen = handleOnOpen
                connection.onmessage = handleOnMessage
            }
        }
    }
    xhr.send();
    this.checkLoginStatus()
}

window.onclick = function(event) {
    this.console.log(event.srcElement.id)
    if (event.srcElement.id === "search_song_button" || event.srcElement.id === "song-results" || event.srcElement.id === "search_song") {
        this.console.log("Clicked on search")
    } else {
        this.clearResults()
        var inp = document.getElementById("search_song")
        inp.val = ""
    }
}

function addUriToQueue(songid) {
    console.log(songid)
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
                totalTime = response.item.duration_ms
                console.log(response.progress_ms)
                remaining_time = response.item.duration_ms - response.progress_ms
                remainingTime = remaining_time
            }
            console.log(remainingTime)
            var progressValue = (remainingTime / totalTime) * 1000
            progress_bar.value = Math.round(progressValue)
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
    xhr.open("GET", urlCheckSession, true);
    xhr.onreadystatechange = function() { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var response = JSON.parse(xhr.response)
            console.log(response)
            console.log("URL check session")
            constructQueueView(response.queue)
        }
    }
    xhr.send();
}

function checkLoginStatus() {
    var p = document.getElementById("status")
    if (isLoggedIn) {
        var login = document.getElementById("login")
        var logout = document.getElementById("logout")
        login.style.display = "none"
        logout.style.display = "inline"

        p.innerHTML = "Connected"
    } else {
        var login = document.getElementById("login")
        var logout = document.getElementById("logout")
        logout.style.display = "none"
        login.style.display = "inline"

        p.innerHTML = "Disconnected"
    }
}

function constructQueueView(queue) {
    console.log(queue)
    var container = document.getElementById("results-holder")
    container.innerHTML = ""
    for (var i = 0; i < queue.length; i++) {
        var div = document.createElement("div")
        div.className = "results-item-container"
        container.appendChild(div)
        var innerDiv = document.createElement("div")
        innerDiv.className = "results-item"
        innerDiv.innerHTML = queue[i].songname
        div.appendChild(innerDiv)
    }
}

function constructResultsView(songs) {
    var container = document.getElementById("song-results")
    for (var i = 0; i < songs.length; i++) {
        var div = document.createElement("div")
        div.className = "output-container-elem"
        container.appendChild(div)
        var button = document.createElement("button")
        button.className = "control-center-input-add"
        var songName = songs[i].name + " - " + songs[i].artists
        var duration = songs[i].duration
        button.id = songs[i].uri + "&&" + songName + "&&" + duration
        button.onclick = function(event) {
            addUriToQueue(event.srcElement.id)
            clearResults()
            container.innerHTML = ""
        }
        div.appendChild(button)
        var p = document.createElement("p")
        p.className = "output-container-elem-p"
        p.innerHTML = songName

        div.appendChild(p)
    }
}

function decrementTime() {
    var currTime = (new Date()).getTime()
    var diff = Math.round((currTime - lastCalled))
    remainingTime = remainingTime - diff
    var progressValue = (remainingTime / totalTime) * 1000
    progressValue = Math.round(progressValue)
        //progress_bar.value = Math.round(progressValue)
    lastCalled = currTime
    var displayTime = 1
    progress_bar.value = Math.max(progressValue, displayTime)
    if (progressValue <= 1) {
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

function login() {
    console.log("Login second")
    var xhr = new XMLHttpRequest();
    var url = "/login?jid=" + jidGlobal + "&sessionize=" + sidFromSessionize
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var response = JSON.parse(xhr.response)
            console.log(response)
            var redirectURL = response.url
            console.log(redirectURL)
            const win = window.open(redirectURL, 'Spotify Login', 'width=700,height=500,top=40,left=40')
        }
    }
    xhr.send();
}

function logout() {
    const url = 'https://www.spotify.com/logout/'
    const spotifyLogoutWindow = window.open(url, 'Spotify Logout', 'width=700,height=500,top=40,left=40')
    setTimeout(() => {
        spotifyLogoutWindow.close()
        window.location.href = "/jukebox?jid=" + jidGlobal
    }, 1000)
    isLoggedIn = false
}

function playSong() {
    console.log("Play song")
    var url = "/playqueue?jid=" + jidGlobal
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

function searchChange() {
    var container = document.getElementById("song-results")
    container.innerHTML = ""
}

function searchForSong() {
    if (isLoggedIn) {
        ccifocus()
        var searchVal = document.getElementById("search_song").value
        console.log(searchVal)

        var xhr = new XMLHttpRequest();
        var url = "/searchforsong?query=" + searchVal + "&sessionize=" + sidFromSessionize
        console.log(url)
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
                console.log(songs)
                if (songs.length <= 0)
                    alert("No songs found")
                else
                    constructResultsView(songs)
            }
        }
        xhr.send()
    } else {
        alert("Please log in first.")
    }
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

function handleOnOpen() {
    console.log('Websocket Client Connected')
}

function handleOnMessage(message) {
    console.log("message is ")
    console.log(message)
    if (message.data) {
        var data = JSON.parse(message.data)
        switch (data.message_type) {
            case 'register_response':
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
            case 'login_sessionize_success':
                console.log("Successfully logged in")
                isLoggedIn = true
                checkLoginStatus()
                checkinWithServer()
                checkinDuration()
                isOwner = data.isOwner
                break
            case 'new_owner':
                isOwner = data.isOwner
                break
            default:
                console.log(data)
                break
        }
    }
}


// Original darkjukebox code

var cci = document.getElementById("search_song")

function ccifocus() {
    console.log("Focusing")
    var songResults = document.getElementById("song-results")
    songResults.style.height = "230px"
    songResults.style.paddingTop = "5px"
    songResults.style.paddingBottom = "5px"
    songResults.style.overflow = "scroll"
}

function clearResults() {
    var songResults = document.getElementById("song-results")
    songResults.style.height = "0px"
    songResults.style.paddingTop = "0px"
    songResults.style.paddingBottom = "0px"
    songResults.style.overflow = "hidden"
}