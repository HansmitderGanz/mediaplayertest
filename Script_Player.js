
$(document).ready(function() {
    // Fade out the white overlay on page load
    $("#whiteOverlay").fadeOut(2000);
    

      // Set video size to large as soon as the page loads
  changeVideoSize(1280);
  adjustMarkerSize(1280);

  $('.station').removeClass('selected');
    $('.station[title="Groß"]').addClass('selected');
});

document.body.addEventListener("dragover", function (evt) {
    evt.preventDefault();
}, false);

document.body.addEventListener("drop", function (evt) {
    // create a pseudo-event
    evt.preventDefault();
    var files = evt.dataTransfer.files;
    if (files.length > 0) {
        var file = files[0];

        if (file.type.startsWith("video/")) {
            // Call loadVideo() function
            var pseudoEvent = { target: { files: [file] } };
            loadVideo(pseudoEvent);
            
        } else if (file.type.startsWith("text/")) {
            let pseudoEvent = { target: { files: [file] } };
            loadTranscript(pseudoEvent);
        } else {
            alert("Bitte ziehen Sie nur .mp4/.mov- oder .txt-Dateien auf diese Seite.");
        }
    }
}, false);


function hideOnLoad() {
    let transcriptElements = document.getElementsByClassName('transcript-related');
    for (let i = 0; i < transcriptElements.length; i++) {
      transcriptElements[i].style.display = 'none';
    }
  }
  

window.addEventListener('load', function() {
        window.scrollTo(0, 0);
    });

var markers = [];
var videoFile = '';
var videoElement;
var baseTimecodeInSeconds = 0;
var isBaseTimecodeSet = false;

function loadVideo(event) {
    var file = event.target.files[0];
    videoFile = file.name;
    var url = URL.createObjectURL(file);
    var videoLabel = document.getElementById("videoFileLabel"); 
    videoLabel.title = "Hochgeladene Datei: " + videoFile;

    videoElement = document.getElementById("myVideo"); 
    videoElement.src = url;
    videoElement.load();

    videoElement.addEventListener('play', function() {
        if (!isBaseTimecodeSet) {
            videoElement.pause();
        }
    });

    // "Wartezeit" für das Laden des ersten Videoframes
    setTimeout(function() {
    var startTC = null;
    while (!startTC) {
        startTC = prompt('Bitte geben Sie den Start Timecode ein (im Format HH:MM:SS:FF)');
        if (startTC === null) {
            alert('Sie müssen einen Start-Timecode eingeben, um das Video abspielen zu können.');
        }
    }
    baseTimecodeInSeconds = timecodeToSeconds(startTC); // Verwendung der aktualisierten 'timecodeToSeconds'-Funktion
    isBaseTimecodeSet = true;
}, 1000);

    videoElement.addEventListener('timeupdate', (event) => {
        let currentTime = event.target.currentTime;
        var body = document.body;
        var isDarkMode = body.classList.contains('dark-mode');
        document.querySelectorAll('#transcript p').forEach(p => {
            let pTime = parseFloat(p.getAttribute('data-time'));
            var underlineDuration = 1.0; // Dauer in Sekunden
            if(Math.abs(currentTime - pTime) <= underlineDuration) { 
                p.style.textDecoration = isDarkMode ? 'underline white' : 'underline';
                p.style.textDecorationThickness = '4px'; 
                p.style.textDecorationColor = 'orange';
                p.scrollIntoView({behavior: 'smooth', block: 'nearest'});
            }
            else {
                p.style.textDecoration = 'none';
                if (p.style.color !== 'green')
                    p.style.color = isDarkMode ? 'white' : 'black';
            }
        });
    });
    
    markers = [];
    updateMarkerList();
}

function timecodeToSeconds(input) {
    if (input.includes(":")) {
        var parts = input.split(':');
        return parts[0] * 3600 +  // Stunden
               parts[1] * 60 +   // Minuten
               parts[2] * 1 +    // Sekunden
               parts[3] / 25;    // Frames
    } else {
        var hours = input.slice(0, 2);
        var minutes = input.slice(2, 4);
        var seconds = input.slice(4, 6);
        var frames = input.slice(6, 8);
        return hours * 3600 +
               minutes * 60 +
               seconds * 1 +
               frames / 25;
    }
}

var slider = document.querySelector(".size-slider");
    var stations = Array.from(document.querySelectorAll(".station"));
    
function magnify(stationElement) {
    stations.forEach(s => s.classList.remove("magnified"));
    stationElement.classList.add("magnified");
}

slider.addEventListener('click', function(event) {
    if (event.target.classList.contains('station')) {
        magnify(event.target);
    }
    event.stopPropagation();
});


function toggleTranscript() {
    // Selektiert alle Elemente mit der Klasse 'transcript-related'
    var transcriptRelatedElements = document.getElementsByClassName('transcript-related');

    // Iteriert durch alle Elemente und toggled die Sichtbarkeit
    for (var i = 0; i < transcriptRelatedElements.length; i++) {
        if (transcriptRelatedElements[i].style.display === "block") {
            transcriptRelatedElements[i].style.display = "none";
        } else {
            transcriptRelatedElements[i].style.display = "block";
        }
    }
}

function loadTranscript(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        var sections = e.target.result.split('\n\n'); // Teilt die Datei in Elemente, getrennt durch leere Zeilen
        const transcriptDiv = document.getElementById('transcript');
        transcriptDiv.innerHTML = ''; // Leert das Transkript-Feld
        sections.forEach(section => {
            var lines = section.split('\n'); // Teilt den Abschnitt in Zeilen
            if (lines.length < 2) return; // Ignoriert Abschnitte, die weniger als 2 Zeilen haben
            var timestamps = lines[0]; // Der Zeitstempel ist die erste Zeile
            var text = lines.slice(1).join(' '); // Der Rest der Zeilen ist der Transkripttext
            const p = document.createElement('p');
            p.classList.add("interactable");
            
            // Überprüft, ob der Text einen Sprecher enthält und entfernt ihn
            var speakerIndex = text.indexOf(':');
            if (speakerIndex !== -1) {
                text = text.slice(speakerIndex + 1).trim(); // Entfernt den Sprecher vom Anfang des Textes
                if (lines[1].startsWith('Sprechertext:')) {
                    p.style.color = 'green'; // Setzt die Textfarbe auf grün, wenn der Sprecher "Sprechertext" ist
 		p.style.fontWeight = 'bold'; // Setzt den Text auf fett, wenn der Sprecher "Sprechertext" ist
                }
            }
            
            p.textContent = text;
            p.style.cursor = 'pointer';
            // Umwandelt den Startzeitstempel in Sekunden
            var startTime = timestamps.split(' ')[0];
            var timeParts = startTime.split(':');
            var time = 
                Number(timeParts[0]) * 3600 +  // Stunden
                Number(timeParts[1]) * 60 +    // Minuten
                Number(timeParts[2]) +         // Sekunden
                Number(timeParts[3]) / 25;     // Frames (angenommen, es gibt 25 Frames pro Sekunde)

            p.setAttribute('data-time', time);
        
            p.onclick = () => {
                videoElement.currentTime = time;
            }
            transcriptDiv.appendChild(p);
        });
    }
    reader.readAsText(file);
}

document.getElementById('transcriptSearch').addEventListener('input', function (e) {
  var searchString = e.target.value.toLowerCase();
  var transcriptLines = document.querySelectorAll('#transcript p');
  transcriptLines.forEach(function (line) {
    var lineText = line.textContent.toLowerCase();
    if (lineText.includes(searchString)) {
      line.style.display = 'block';
    } else {
      line.style.display = 'none';
    }
  });

  // Wenn das Suchfeld geleert wird, scrollt das Transkript-Fenster zur aktuellen Position im Video
  if (searchString === '') {
    var currentTime = videoElement.currentTime;
    transcriptLines.forEach(function (line) {
      var lineTime = parseFloat(line.getAttribute('data-time'));
      if (Math.abs(currentTime - lineTime) <= 0.5) {
        line.scrollIntoView({behavior: 'smooth'});
      }
    });
 // Entfernt den Fokus vom Suchfeld
    e.target.blur();
  }
});



function toggleShortcuts() {
  var button = document.getElementById('toggleShortcuts');
  var shortcutsDiv = document.getElementById('shortcuts');
  if (shortcutsDiv.style.display === "none") {
      shortcutsDiv.style.display = "block";
      button.innerHTML = "🙉"; // Shortcuts aufgeklappt
  } else {
      shortcutsDiv.style.display = "none";
      button.innerHTML = "🙈"; // Shortcuts zugeklappt
  }
}

function toggleDarkMode() {
    var body = document.body;
    if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
    } else {
        body.classList.add('dark-mode');
    }
}

function changeVideoSize(size) {
    var videoElement = document.getElementById('myVideo');
    videoElement.style.width = size + 'px';
    videoElement.style.height = 'auto';

    // Entfernen von 'selected' und 'magnified' von allen Stationen
    $('.station').removeClass('selected magnified');

    // Hinzufügen von 'selected' und 'magnified' zur passenden Station
    if (size === 480) {
        $('.station[title="Klein"]').addClass('selected magnified');
    } else if (size === 720) {
        $('.station[title="Mittel"]').addClass('selected magnified');
    } else if (size === 1280) {
        $('.station[title="Groß"]').addClass('selected magnified');
    }
}

function setMarker() {
    var currentTime = videoElement.currentTime;
    var description = '';

    do {
        description = prompt("Bitte geben Sie eine Anmerkung für den Marker ein");
        if (description === null) {
            return;
        }
    } while(description.trim() === '');

    // Die aktuelle Zeit des Videos wird zur Basiszeit addiert, um den Timecode zu berechnen
    var timecode = convertTimeToTimecode(baseTimecodeInSeconds + currentTime, 25);
    markers.push({timeInSeconds: currentTime, timecode: timecode, description: description});
    updateMarkerList();
}

function updateMarkerList() {
    var markerList = $('#markerList');
    markerList.empty();
    markers.forEach(function(marker, index) {
        var listItem = $('<li></li>');
        var jumpButton = $('<button class="interactable" style="margin-right: 10px;">Gehe zu</button>');
        jumpButton.click(function(){
            videoElement.currentTime = marker.timeInSeconds;
        });
        listItem.text('Timecode: ' + marker.timecode + ', Anmerkung: ' + marker.description);
        listItem.prepend(jumpButton);
        var actionSelect = $('<select class="interactable actionSelect" onchange="handleMarkerActions(this, ' + index + ')" style="margin-left:10px; padding: 5px; border-radius: 5px; cursor: pointer;"><option selected disabled>Bearbeiten</option><option value="edit">Anmerkung ändern</option><option value="delete">Löschen</option></select>');
        listItem.append(actionSelect);
        listItem.css("margin-bottom", "10px");
        markerList.append(listItem);
    });
}

function handleMarkerActions(selectElem, index) {
    var selectedOption = selectElem.value;
    if (selectedOption === 'edit') {
        var newDescription = prompt("Bitte geben Sie eine neue Anmerkung ein");
        markers[index].description = newDescription;
        updateMarkerList();
    } else if (selectedOption === 'delete') {
        markers.splice(index, 1);
        updateMarkerList();
    }
    selectElem.selectedIndex = 0;
}

function adjustMarkerSize(size) {
    var markerList = document.getElementById("markerList");  
    if (size === 480) {
        markerList.style.height = "500px";
    } else if (size === 720) {
        markerList.style.height = "400px";
    } else if (size === 1280) {
        markerList.style.height = "110px";
    }
}



function convertTimeToTimecode(timeInSeconds, framesPerSecond) {
    var hours = Math.floor(timeInSeconds / 3600);
    timeInSeconds %= 3600;
    var minutes = Math.floor(timeInSeconds / 60);
    timeInSeconds %= 60;
    var seconds = Math.floor(timeInSeconds);
    var frames = Math.floor((timeInSeconds % 1) * framesPerSecond);
    return hours.toString().padStart(2, '0') + ":" 
        + minutes.toString().padStart(2, '0') + ":" 
        + seconds.toString().padStart(2, '0') + ":"
        + frames.toString().padStart(2, '0');
}

function forward(seconds) {
    videoElement.currentTime += seconds;
}

function rewind(seconds) {
    videoElement.currentTime = Math.max(0, videoElement.currentTime - seconds);
}

function exportMarkers() {
    var nameWithoutExtension = videoFile.replace(/\.[^/.]+$/, "");
    var text = '';
    markers.forEach(function(marker) {
        text += 'Sichtungsanmerkung\t' + marker.timecode + '\tTC\tred\t' + marker.description + '\t1\t\n';
    });

    var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = nameWithoutExtension + '_Anmerkungen_AvidMarker.txt';
    a.click();
    window.URL.revokeObjectURL(url);
}

function handleSaveOptions(selectElem) {
    var selectedOption = selectElem.value;
    if (selectedOption === 'save') {
        saveMarkers();
    } else if (selectedOption === 'load') {
        document.getElementById('loadMarkersFile').click();
    }
    selectElem.selectedIndex = 0;
}

function saveMarkers() {
    var date = new Date();
    var dateString = date.getFullYear() + '-' + ('0' + (date.getMonth()+1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
    var text = JSON.stringify(markers);
    var blob = new Blob([text], {type: "text/plain"});
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = videoFile.replace(/\.[^/.]+$/, "") + "_Anmerkungen_Speicherstand_" + dateString + ".txt";
    a.click();
    window.URL.revokeObjectURL(url);
}

function loadMarkers(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function(e){
        var content = e.target.result;
        markers = JSON.parse(content);
        updateMarkerList();
    }
    reader.readAsText(file);
}

function handleExportOptions(selectElem) {
    var selectedOption = selectElem.value;

    // Fenster erscheint, um den Namen des Benutzers zu erfassen
    var userName = prompt("Bitte geben Sie Ihren Namen ein");
    if (!userName) {
        alert('Abbruch des Exports: Kein Name eingegeben.');
        selectElem.selectedIndex = 0;
        return;
    }

    if (selectedOption === 'markers') {
        exportMarkers(userName);
    } else if (selectedOption === 'table') {
        exportTable(userName);
    }
    selectElem.selectedIndex = 0;
}


function exportTable(userName) {
    var nameWithoutExtension = videoFile.replace(/\.[^/.]+$/, "");

    // Hinzufügen von "Sichtung durch: " und dem Namen des Benutzers unter dem Titel
    var text = 'Sichtungsname: ' + nameWithoutExtension + '\nSichtung durch: ' + userName + '\n\nNummer\tTimecode\tAnmerkung\n';

    markers.forEach(function(marker, index) {
        text += (index + 1) + '\t' + marker.timecode + '\t' + marker.description + '\n';
    });

    var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = nameWithoutExtension + '_Anmerkungen_Tabelle.txt';
    a.click();
    window.URL.revokeObjectURL(url);
}
function togglePlayPause() {
    var videoElement = document.getElementById("myVideo");
    if (videoElement.paused || videoElement.ended) {
        videoElement.play();
    } else {
        videoElement.pause();
    }
}

window.addEventListener('keydown', function(event) {
    // Überprüfen, ob das Transkript-Suchfeld den Fokus hat
    if (document.activeElement.id === 'transcriptSearch') {
        return; // Wenn ja, beenden Sie die Funktion frühzeitig
    }

    if (event.key === 'm' || event.key === 'M') {
        setMarker();
    } 
    else if (event.altKey && event.key === 's') {
        saveMarkers();
    } 
    else if (event.code === 'Space') {
        event.preventDefault();
        togglePlayPause();
    }
    else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (event.altKey) {
            rewind(1/25); // 1 Frame zurück
        } else {
            rewind(5); // 5 Sekunden zurück
        }
    }
    else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (event.altKey) {
            forward(1/25); // 1 Frame vor
        } else {
            forward(5); // 5 Sekunden vor
        }
    }
});
