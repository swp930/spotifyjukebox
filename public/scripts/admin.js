function send() {
    var inpid = document.getElementById("inp-id").value
    console.log(inpid)
    var xhr = new XMLHttpRequest()
    var url = "/handletext?text=" + inpid
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var response = JSON.parse(xhr.response)
            console.log(response)
        }
    }
    xhr.send()
}

function sessionToIDMap() {
    sendText("console.log(sessionToIDMap)")
}

function sessionToConnectMap() {
    sendText("console.log(sessionToConnectMap)")
}

function jukeboxToSessionMap() {
    sendText("console.log(jukeboxToSessionMap)")
}

function jukeboxToSessionMapKeys() {
    sendText("console.log(Object.keys(jukeboxToSessionMap))")
}



function sendText(str) {

    var xhr = new XMLHttpRequest()
    var url = "/handletext?text=" + str
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var response = JSON.parse(xhr.response)
            console.log(response)
        }
    }
    xhr.send()
}