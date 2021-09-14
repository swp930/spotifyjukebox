
// This function generates a random id to be used for a new Spotify jukebox
function createJukeBox() {
    console.log("Jukebox created!")
    console.log(guid())
    window.location.href = "/jukebox?jid=" + guid();
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

function joinJukeBox() {
    var id = document.getElementById("jukebox_id").value
    console.log(id)
    window.location.href = "/jukebox?jid=" + id
}