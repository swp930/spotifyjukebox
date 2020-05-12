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

function sessionizeToConnectMap() {
    sendText("console.log(sessionizeToConnectMap)")
}

function sessionizeToConnectMapKeys() {
    sendText("console.log(Object.keys(sessionizeToConnectMap))")
}

function sessionizeToIDMap() {
    sendText("console.log(sessionizeToIDMap)")
}

function jboxToSessionizeMap() {
    sendText("console.log(jboxToSessionizeMap)")
}

function jboxToQueueMap() {
    sendText("console.log(jboxToQueueMap)")
}

function jboxToSessionizeOwner() {
    sendText("console.log(jboxToSessionizeOwner)")
}

function resetVars() {
    var str = "sessionizeToConnectMap = {};sessionizeToIDMap = {};jboxToSessionizeMap = {};jboxToQueueMap = {}; jboxToSessionizeOwner = {};"
    sendText(str)
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