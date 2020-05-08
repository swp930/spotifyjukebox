var cci = document.getElementById("cci")

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