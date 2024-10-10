$(document).ready(function() {
    $("#whiteOverlay").fadeOut(2000);

    // setTimeout to ask for the user's name after the fade out transition is over
    setTimeout(function(){ 
        currentUserName = prompt("Bitte geben Sie Ihren Namen ein");
    }, 2000);

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

    // Check for the theme and show tooltip

    // Wenn das Transkript-Feld keinen Text hat 
    if (!$('#transcript').text().trim().length) { 
        $('.transcript-related').addClass('hidden');
        $('#toggleEditMode').addClass('hidden'); // Versteckt den "Bearbeiten" Button
        $('#removeTranscriptButton').addClass('hidden'); // Versteckt den "Transkript entfernen" Button
    }

    $("#toggleTranscriptVisibility").prop('checked', true);
    if ($('#toggleTranscriptVisibility').is(':checked')) {
        toggleTranscript();
    }
});

var markers = [];
var videoFile = '';
var videoElement;
var pendingParagraphIndex = 0;
var drawingPaths = [];


// Globale Variable, die den Index des aktuellen Absatzes speichert
let currentParagraphIndex = 0;
let paragraphStartTime = 0;
let isSpeaking = false;
let lastSpokenText = null;
let paragraphBeingRead = false; // Neue Variable
let nextSpeakTime = Infinity;
let currentUserName = '';

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
    if (document.activeElement.id === 'transcriptSearch' || document.activeElement.tagName === 'TEXTAREA') {
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
    var videoElement = document.getElementById("myVideo");

    if (event.key === '/') {
        event.preventDefault();
        var timecode = prompt('Bitte geben Sie den Timecode im Format HH:MM:SS:FF ein');
        if (timecode !== null) {
            var seconds = timecodeToSeconds(timecode);
            videoElement.currentTime = seconds;
        }
    }
});

var currentMarkerSelection = 0; // Variabel um die aktuelle Marker-Auswahl zu speichern

window.addEventListener('keydown', function(event) {
    if (document.activeElement.nodeName === 'INPUT') {
        return;
    }
  if (event.key === 'ArrowUp') { // Pfeil nach oben
    event.preventDefault();
    if(currentMarkerSelection > 0) { // Überprüfen, ob wir nicht am Anfang der Markierung sind
      currentMarkerSelection--; 
      videoElement.currentTime = markers[currentMarkerSelection].timeInSeconds; // springt zur vorherigen Markierung
      markers[currentMarkerSelection].visited = true; // Set marker as visited
      updateMarkerList();
    }
  } else if (event.key === 'ArrowDown') { // Pfeil nach unten
    event.preventDefault();
    if(currentMarkerSelection < markers.length - 1) { // Überprüfen, ob wir nicht am Ende der Markierung sind
      currentMarkerSelection++;
      videoElement.currentTime = markers[currentMarkerSelection].timeInSeconds; // springt zur nächsten Markierung
      markers[currentMarkerSelection].visited = true; // Set marker as visited
      updateMarkerList();
    }
  }
});



// Deklaration der booleschen Variable zu Beginn des Skripts
var isFirstVideoLoad = true;

function loadVideo(event) {
    var file = event.target.files[0];
    videoFile = file.name;
    var url = URL.createObjectURL(file);
    var videoLabel = document.getElementById("videoFileLabel"); 
    videoLabel.title = "Hochgeladene Datei: " + videoFile;
    
    videoElement = document.getElementById("myVideo");
    videoElement.src = url;
    videoElement.load();

    // Überprüfen Sie, ob es das erste Mal ist, dass ein Video geladen wurde
    if (!isFirstVideoLoad) {
        // Löschen der Marker, wenn es nicht das erste Mal ist
        markers = [];
        updateMarkerList();

        // Ausblenden der Markerliste, wenn keine Marker vorhanden sind 
        var markerListContainerElement = document.getElementById('markerListContainer');
        if (markers.length === 0) {
            markerListContainerElement.classList.add('hidden');
        }
    } else {
        // Setzen Sie isFirstVideoLoad auf false, nachdem das erste Video geladen wurde
        isFirstVideoLoad = false;
    }

    

videoElement.addEventListener('canplay', function () {
    pendingParagraphIndex = paragraphsToRead.findIndex(p => p.startTime > 0);
    if (pendingParagraphIndex === -1) pendingParagraphIndex = 0; // Zurücksetzen auf 0, wenn alle Startzeiten 0 sind
});


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
if (Math.abs(currentTime - pTime) <= underlineDuration) { 
    // ...
    let transcriptBox = document.getElementById('transcript');
    transcriptBox.scrollTop = p.offsetTop - transcriptBox.offsetTop;
}

            // Wenn der Absatz grün ist, lies ihn, aber nur wenn der Text noch nicht gesprochen wurde
            // Hier sollten wir von 'p.textContent' zu 'p.save'
            if (p.style.color === 'green' && (!isSpeaking || p.getAttribute('data-saved') != lastSpokenText)) {
                isSpeaking = true;
                lastSpokenText = p.getAttribute('data-saved');
                speak(p.getAttribute('data-saved'));
            }
        } else {
            p.style.textDecoration = 'none';
            if (p.style.color !== 'green')
                p.style.color = isDarkMode ? 'white' : 'black';
                
            // Wenn der Absatz nicht mehr unterstrichen ist, den Sprachsyntesestatus zurücksetzen
            if (p.getAttribute('data-saved') == lastSpokenText) {
                isSpeaking = false;
                lastSpokenText = null;
                stopSpeaking();
            }
        }
    });
});




videoElement.addEventListener('play', function () {
    // Aktualisieren des Sprechertexts, wenn das Video nach einer Pause abgespielt wird
    if (speechSynthesisEnabled && !isSpeaking) {
        isSpeaking = true;
        speak(paragraphsToRead[currentParagraphIndex].text);
    }
});

videoElement.addEventListener('pause', function () {
    // Pausieren der Sprachsynthese, wenn das Video angehalten wird
    speechSynthesis.cancel();
    isSpeaking = false;
});


var currentSpeechInstance = null;


function speak(text) {
    currentSpeechInstance = new SpeechSynthesisUtterance();

    setTimeout(()=>{
            currentSpeechInstance.text = text;
            currentSpeechInstance.lang = 'de';

            var volumeLevel = document.getElementById('volume').value;

            currentSpeechInstance.volume = volumeLevel;

            currentSpeechInstance.rate = 1.5;
            currentSpeechInstance.pitch = 1;

            speechSynthesis.speak(currentSpeechInstance);
        }, 1000);
}

videoElement.addEventListener('timeupdate', (event) => {
    let currentTime = event.target.currentTime;
    var body = document.body;
    var isDarkMode = body.classList.contains('dark-mode');
    document.querySelectorAll('#transcript p').forEach(p => {
        let pTime = parseFloat(p.getAttribute('data-time'));
        var underlineDuration = 1.0;
        if(Math.abs(currentTime - pTime) <= underlineDuration) { 
            p.style.textDecoration = isDarkMode ? 'underline white' : 'underline';
            p.style.textDecorationThickness = '4px'; 
            p.style.textDecorationColor = 'orange';
            p.scrollIntoView({behavior: 'smooth', block: 'nearest'});

            // Neu: Prüfen Sie, ob das Video nicht pausiert ist
            if (p.style.color === 'green' && (!isSpeaking || p.getAttribute('data-saved') != lastSpokenText) && !videoElement.paused) {
                isSpeaking = true;
                lastSpokenText = p.getAttribute('data-saved');
                speak(p.getAttribute('data-saved'));
            }
        } else {
            p.style.textDecoration = 'none';
            if (p.style.color !== 'green')
                p.style.color = isDarkMode ? 'white' : 'black';
                
            if (p.getAttribute('data-saved') == lastSpokenText) {
                isSpeaking = false;
                lastSpokenText = null;
                stopSpeaking();
            }
        }
    });
});



}

window.onclick = function(event) {
  if (!event.target.matches('button')) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}

function toggleTranscript() {
    var transcriptContainer = document.getElementById('transcriptContainer');
    transcriptContainer.classList.toggle("hidden");
}

var paragraphsToRead = [];
var currentParagraph = 0;

function loadOldTranscriptFormat(transcriptDiv, content) {
    var sections = content.split("\n\n");

    sections.forEach((section) => {
        var lines = section.split("\n");
        if (lines.length < 2) return;

        var timestamps = lines[0];
        var text = lines.slice(1).join(" ");
        const p = document.createElement("p");
        p.classList.add("interactable-transcript");

        var speakerIndex = text.indexOf(":");
        if (speakerIndex !== -1) {
            text = text.slice(speakerIndex + 1).trim();
            if (lines[1].startsWith("Sprechertext:")) {
                p.style.color = "green";
                p.style.fontWeight = "bold";
            }
        }

        p.textContent = text;
        p.style.cursor = "pointer";

        var startTime = timestamps.split(" ")[0];
        var timeParts = startTime.split(":");
        var timeInSeconds =
            Number(timeParts[0]) * 3600 +
            Number(timeParts[1]) * 60 +
            Number(timeParts[2]) +
            Number(timeParts[3]) / 25;

        p.setAttribute("data-time", timeInSeconds);

        p.onclick = () => {
            videoElement.currentTime = timeInSeconds;
        };

        transcriptDiv.appendChild(p);
        paragraphsToRead.push({
            text: text,
            startTime: timeInSeconds
        });
    });
}

let editMode = false;
function toggleEditMode() {
    var toggleEditButton = document.getElementById("toggleEditMode"); 
    var videoElement = document.getElementById("myVideo"); 
    editMode = !editMode;
    var paragraphs = document.querySelectorAll('#transcriptContainer p, #transcriptContainer textarea');
    paragraphs.forEach(p => {
        if (editMode) {
            var textarea = document.createElement('textarea');
            textarea.style.width = "100%";
            textarea.setAttribute("class", "editable"); 
            // Setzt die Zeilenzahl entsprechend der Anzahl der Zeilen in p
            textarea.rows = p.textContent.split('\n').length || 1;
            textarea.value = p.textContent;
            textarea.style.color = p.style.color;
            textarea.style.fontWeight = p.style.fontWeight;
            textarea.setAttribute('data-time', p.getAttribute('data-time'));
            textarea.setAttribute('data-saved', p.getAttribute('data-saved'));
            textarea.onkeydown = function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                }
            };
        
            p.replaceWith(textarea);
            toggleEditButton.innerHTML = "Bearbeitung beenden"; // Text ändern
        } else {
            var para = document.createElement('p');
            para.textContent = p.value;
            para.style.color = p.style.color;
            para.style.fontWeight = p.style.fontWeight;
            para.setAttribute('data-time', p.getAttribute('data-time'));

            // Entfernen Sie den Timecode aus dem Text
            let textWithoutTimecode = p.value.split('\n')[1];
            para.setAttribute('data-saved', textWithoutTimecode);

            para.onclick = () => { 
                videoElement.currentTime = parseFloat(p.getAttribute('data-time'));
            };

            para.style.cursor = "pointer";
            para.classList.add('interactable-transcript');
            
            p.replaceWith(para);
            toggleEditButton.innerHTML = "Bearbeiten"; // Text ändern
        }
    });
}


// EventListener für das Doppelklicken 
document.body.addEventListener("dblclick", function (evt) {
    // Überprüfen, ob das Transkript-Feld im Bearbeitungsmodus ist und ob das Ziel ein Textbereich ist
    if (editMode && evt.target.tagName.toLowerCase() === 'textarea') {
        
        // Überprüfen, ob der Text bereits formatiert ist
        var isFormatted = evt.target.style.fontWeight === 'bold';
        var confirmed;
      
        if (isFormatted) {
            // Bitten Sie um Bestätigung, um den Text in normalen Text zu kovertieren
            confirmed = confirm("Möchten Sie diesen Text zu einem normalen Text konvertieren?");

            if (confirmed) {
                // die Formatierung zurücksetzen
                evt.target.style.color = "black"; 
                evt.target.style.fontWeight = "normal";
            }
        } else {
            // Bitten Sie um Bestätigung, um den Text in Sprechertext zu konvertieren
            confirmed = confirm("Möchten Sie diesen Text zu einem Sprechertext konvertieren?");
            
            if (confirmed) {
                // Die entsprechende Formatierung anwenden
                evt.target.style.color = "green";
                evt.target.style.fontWeight = "bold";
            }
        }

        // Wenn bestätigt, extrahieren und speichern des Texts (ohne "Sprechertext: ") in beiden Fällen
        if (confirmed) {
            var savedText = evt.target.value.replace(/^Sprechertext: /, "");  
            evt.target.setAttribute('data-saved', savedText);
        }
    } 
}, false);

function loadNewTranscriptFormat(transcriptDiv, content) {
  var matches = content.matchAll(
    /([\t\s]*\d{2}:\d{2}(?: - SPRECHER)?)([\s\S]*?)(?=\n[\t\s]*\d{2}:\d{2}|$)/g
  );

  for (let match of matches) {
    var timestamps = match[1].trim();
    var text = match[2].trim();
    const p = document.createElement("p");
    p.classList.add("interactable-transcript");

    var isSpeaker = timestamps.endsWith("- SPRECHER");

    if (isSpeaker) {
      timestamps = timestamps.slice(0, timestamps.lastIndexOf(" - SPRECHER"));
      p.style.color = "green";
      p.style.fontWeight = "bold";
      
    }

    var timeParts = timestamps.split(":");
    var timeInSeconds = Number(timeParts[0]) * 60 + Number(timeParts[1]);

    p.setAttribute("data-time", timeInSeconds);

    p.addEventListener("click", (e) => {
      var paragraphTimeInSeconds = e.target.getAttribute("data-time");
      videoElement.currentTime = paragraphTimeInSeconds;
    });

     p.textContent = `${timestamps}\n${text}`;
    p.setAttribute("data-saved", `${text}`);
    p.style.cursor = "pointer";

    transcriptDiv.appendChild(p);

    paragraphsToRead.push({ text: text, startTime: timeInSeconds });
  }
}

function loadTranscript(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
        var content = e.target.result;
        const transcriptDiv = document.getElementById("transcript");
        transcriptDiv.innerHTML = "";
       

        if (content.startsWith("<begin subtitles>")) {
            loadOldTranscriptFormat(transcriptDiv, content);
        } else {
            loadNewTranscriptFormat(transcriptDiv, content);
        }
        transcriptDiv.style.height = '300px';

        // Code, um die Sichtbarkeit von Elementen zu ändern, nachdem ein Transkript geladen wurde
        $('.transcript-related').removeClass('hidden'); // Zeigt andere Transkript-bezogene Steuerelemente an
        $('#removeTranscriptButton').removeClass('hidden'); // Zeigt den "Transkript entfernen" Button
        $('#toggleEditMode').removeClass('hidden'); // Zeigt den "Bearbeiten" Button
    };
    reader.readAsText(file, 'UTF-8');
}

function removeTranscript() {
    // Entfernen Sie alle Absätze aus dem Transkript
    document.querySelectorAll("#transcript p, #transcript textarea").forEach(function(p) {
        p.remove();
    });

    // Verstecke die anderen transkriptbezogenen Elemente und zeige den "Transkript laden" Button
    $('.transcript-related').addClass('hidden');
    $('.transcriptActions').addClass('hidden');
    $('#transcriptFile').removeClass('hidden');
    $('#toggleEditMode').addClass('hidden'); // Versteckt den "Bearbeiten" Button
    $('#removeTranscriptButton').addClass('hidden'); // Versteckt den "Transkript entfernen" Butto

    // Zurücksetzen der globalen Variablen, die die Transkriptdaten enthalten
    // Setzen Sie diese Werte entsprechend Ihren ursprünglichen Werten zurück
    markers = [];
    paragraphsToRead = [];

    // Löschen des bisherigen Dateiinputs
    document.getElementById('transcriptFile').value = null;
}

function timecodeToSeconds(input) {
    console.log("Received timecode: ", input);  // Debug Log here
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



let speechSynthesisEnabled = false;



document.getElementById('transcriptSearch').addEventListener('input', function(e) {
    var searchString = e.target.value.toLowerCase();
    var transcriptLines = document.querySelectorAll('#transcript p, #transcript textarea');
    transcriptLines.forEach(function(line) {
        var lineText = line.nodeName === 'P' ? line.textContent.toLowerCase() : line.value.toLowerCase();
        if (lineText.includes(searchString)) {
            line.style.display = 'block';
        } else {
            line.style.display = 'none';
        }
    });

    if (searchString === '') {
        var currentTime = videoElement.currentTime;
        transcriptLines.forEach(function(line) {
            var timeInSeconds = parseFloat(line.getAttribute('data-time') || line.dataset.time);
            var lineTime = typeof timeInSeconds === 'number' ? timeInSeconds : Infinity;
            if (Math.abs(currentTime - lineTime) <= 0.5) {
                line.scrollIntoView({behavior: 'smooth'});
            }
        });
        e.target.blur();
    }
});


function toggleShortcuts() {
  var button = document.getElementById('toggleShortcuts');
  var shortcutsDiv = document.getElementById('shortcuts');
  if (shortcutsDiv.style.display === "none") {
      shortcutsDiv.style.display = "block";
      button.innerHTML = "🙉"; // Pfeil-nach-oben Symbol
  } else {
      shortcutsDiv.style.display = "none";
      button.innerHTML = "🙈"; // Pfeil-nach-unten Symbol
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
}

function setMarker() {
    var currentTime = videoElement.currentTime;
    var description = prompt("Bitte fügen Sie eine Anmerkung für den Marker ein");

    
    // Beenden Sie die Funktion falls keine Beschreibung eingegeben wurde
    if (!description) return;

    var userName = currentUserName ? currentUserName : 'Unbekannter Benutzer';
    var timecode = convertTimeToTimecode(currentTime, 25);
    markers.push({timeInSeconds: currentTime, timecode: timecode, description: description, userName: userName, canvas: new fabric.Canvas(), screenshot: null, hasScreenshot: false,
        screenshotTime: null});
    updateMarkerList();

// Create the screenshot button
var screenshotBtn = document.createElement("button");
screenshotBtn.innerText = "Create Screenshot";
screenshotBtn.onclick = createScreenshot;


    // Show marker list as a new marker is added
    document.getElementById('markerListContainer').classList.remove('hidden');

    updateMarkerList();


}

function updateMarkerList() {
    var markerList = $('#markerList');
    markerList.empty();

     // Sortiert die Markierungen in chronologischer Reihenfolge
  markers.sort((a, b) => {
    return a.timeInSeconds - b.timeInSeconds;
});

    // Marker zur Liste hinzufügen und Marker-Liste anzeigen, wenn Marker vorhanden sind
    if (markers.length > 0) {
        markers.forEach(function(marker, index) {
            var listItem = $('<li></li>');
            var jumpButton = $('<button style="margin-right: 10px;">Gehe zu</button>');
            jumpButton.click(function() {
                videoElement.currentTime = marker.timeInSeconds;
                currentMarkerSelection = index; // Aktualisieren der aktuellen Markerauswahl
                updateMarkerList(); // Aktualisieren der Markerliste
            });
            listItem.text('TC: ' + marker.timecode + ' - Anmerkung: ' + marker.description + ' - ' + marker.userName);
            listItem.prepend(jumpButton);
            var actionSelect = $('<select class="actionSelect" onchange="handleMarkerActions(this, ' + index + ')" style="margin-left:1px; margin-top: 4px; padding: 5px 7px; border-radius: 8px; cursor: pointer;"><option selected disabled>Bearbeiten</option><option value="edit">Anmerkung ändern</option><option value="delete">Löschen</option><option value="screenshot">Screenshot</option></select>');
            listItem.append(actionSelect);
            if (marker.hasScreenshot) {
                listItem.append(' - siehe Screenshot NR ' + marker.screenshotTime);
            }

            // Wenn der aktuelle Marker ausgewählt ist, fügt ihm einen violetten Rand hinzu
            if (currentMarkerSelection === index) {
                listItem.css('border', '2px solid #673AB7');
            }
            markerList.append(listItem);
        });

        document.getElementById('markerListContainer').classList.remove('hidden');
    } else {
        // Marker-Liste verbergen, wenn keine Marker vorhanden sind
        document.getElementById('markerListContainer').classList.add('hidden');
    }
}

function handleMarkerActions(selectElem, index) {
    var selectedOption = selectElem.value;
    if (selectedOption === 'edit') {
        var newDescription = prompt("Bitte geben Sie eine neue Anmerkung ein");
        markers[index].description = newDescription;
        updateMarkerList();
    } else if (selectedOption === 'delete') {
        var reallyDelete = confirm("Möchten Sie wirklich die Anmerkung von '" + markers[index].userName + "' löschen?");
        if (reallyDelete) {
            markers.splice(index, 1);
            updateMarkerList();
        }
    } else if (selectedOption === 'screenshot') {
        createScreenshot(index);
    }
    selectElem.selectedIndex = 0;
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
    
    // Erzeugt ein neues Datum und formatiert es als tt.mm.jjjj
    var date = new Date();
    var dateFormatted = ('0' + date.getDate()).slice(-2) + '.' + ('0' + (date.getMonth()+1)).slice(-2) + '.' + date.getFullYear();

    var text = '';
    markers.forEach(function(marker, index) {
        text += 'Sichtungsanmerkung ' + dateFormatted + '\t' + marker.timecode + '\tTC\tred\t' + marker.description + (marker.hasScreenshot ? ' - siehe Screenshot NR' + marker.screenshotTime + '' : '') + ' (gesetzt von ' + marker.userName + ')\t2\t\n';
    });

    var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = nameWithoutExtension + '_Anmerkungen_AvidMarker_Sichtung_' + currentUserName + '.txt';
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

document.getElementById('toggleSpeechSynthesisButton').addEventListener('click', function() {
    speechSynthesisEnabled = !speechSynthesisEnabled;  // Umschalten der Sprachsynthese
    if (speechSynthesisEnabled && paragraphsToRead.length > 0) {
        moveToNextParagraph();
    } else {
        stopSpeaking();
    }
});

function saveMarkers() {
    var date = new Date();
    var dateString = date.getFullYear() + '-' + ('0' + (date.getMonth()+1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);

    // Erfassen des aktuellen Zustands des Transkripts
    var transcriptState = Array.from(document.querySelectorAll('#transcriptContainer p, #transcriptContainer textarea'))
        .map(p => ({ text: p.textContent || p.value, isBold: p.style.color === 'green', isEditable: p.tagName === 'TEXTAREA', dataTime: p.getAttribute('data-time') }));

    var saveData = {
        markers,
        transcriptState
    };

    var text = JSON.stringify(saveData);
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

function createTranscriptElement(line) {
    var isEditable = line.isEditable;
    var p = document.createElement(isEditable ? 'textarea' : 'p');
    p.textContent = line.text;
    p.style.color = line.isBold ? 'green' : '';
    p.style.fontWeight = line.isBold ? 'bold' : 'normal';
    p.setAttribute('data-time', line.dataTime);

    // Entfernen des Timecodes aus dem Text
    var textToSave = isEditable ? line.text : line.text.split('\n')[1];
    p.setAttribute('data-saved', textToSave);

    if (!isEditable) {
        p.style.cursor = 'pointer';
        p.onclick = function() {
            videoElement.currentTime = line.dataTime;
        }
    }

    p.classList.add("interactable-transcript"); // CSS-Klasse für Interaktives Transkript hinzufügen
    
    return p;
}

function loadMarkers(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
        var content = e.target.result;
        var loadData = JSON.parse(content);
        markers = loadData.markers; 
        var transcriptState = loadData.transcriptState;
        var transcriptContainer = document.getElementById("transcript");

        transcriptContainer.innerHTML = '';

        transcriptState.forEach(line => {
            var newElem = createTranscriptElement(line);
            transcriptContainer.appendChild(newElem);
        });

        // Show the marker list container if there are markers
        var markerListContainerElement = document.getElementById('markerListContainer');
        if (markers.length > 0) {
            markerListContainerElement.classList.remove('hidden');
        }

        updateMarkerList();

        // Ensure that the transcript-related elements are shown
        var transcriptRelatedElements = document.getElementsByClassName('transcript-related');
        Array.from(transcriptRelatedElements).forEach(element => {
            element.classList.remove('hidden');
        });

        // Make sure the 'Transcript Load' button always appears
        var transcriptImportButton = document.querySelector('label[for="transcriptFile"]');
        if (transcriptImportButton) {
            transcriptImportButton.classList.remove('hidden');
        }
    };
    reader.readAsText(file);
}


function handleExportOptions(selectElem) {
    var selectedOption = selectElem.value;

    if (selectedOption === 'markers') {
        exportMarkers();
    } else if (selectedOption === 'table') {
        exportTable();
    }
    selectElem.selectedIndex = 0;
}


function exportTranscript(transcriptState) {
    var text = '';
        
    transcriptState.forEach(function(line) {
        // Überprüfen, ob die Zeile ein Sprechertext ist
        if (line.dataSpeaker) {
            // Einzufügen von "=" vor dem gesamten Text der Zeile, einschließlich des Zeitstempels und des eigentlichen Textes
            text += '= ' + line.text.replace('\n', '\n= ') + '\n\n';
        } else {
            text += line.text + '\n\n';
        }
    });

    return text;
}

function exportTable() {
    var nameWithoutExtension = videoFile.replace(/\.[^/.]+$/, "");

    // Aktuelles Datum erstellen
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //Januar ist 0
    var yyyy = today.getFullYear();
    var todayDate =  dd + '.' + mm + '.' + yyyy;

    // Exportiert Markerliste
    var text = 'Dateiname: ' + nameWithoutExtension 
    + '\nSichtung durch: ' + currentUserName 
    + '\nSichtungsdatum: ' + todayDate;  // Das heutige Datum als Sichtungsdatum hinzufügen

    text += '\n\n-------------- AUFLISTUNG ANMERKUNGEN/SPRECHERTEXT -------------\n\n';

    // Alle Absätze des Transkripts abrufen
    var transcriptLines = Array.from(document.querySelectorAll('#transcript p'));

    // Die längste Anmerkung zuerst finden
    var maxNoteLength = 0;
    markers.forEach(function(marker) {
        if (marker.description.length > maxNoteLength) {
            maxNoteLength = marker.description.length;
        }
    });

    // Tabellenüberschriften berechnen und eine zusätzliche Benutzer-Spalte hinzufügen
    var noteHeader = 'Anmerkung';
    var userHeader = 'gesetzt von'; // Neue Spalte hinzufügen für den Benutzernamen
    var speechHeaderText = 'Sprechertext';
    let repeatCount = Math.max(0, maxNoteLength - noteHeader.length + 1);
text += 'Nummer\tTimecode\t' + noteHeader + ' '.repeat(repeatCount) + '\t' + userHeader + '\t' + speechHeaderText + '\n';

    // Anmerkung und Benutzerinformationen zur ausgegebenen Tabelle hinzufügen
    markers.forEach(function(marker, index) {
        var correspondingTranscriptLine = transcriptLines.find(p => {
            return Math.abs(parseFloat(p.getAttribute('data-time')) - marker.timeInSeconds) <= 1;
        });

        var speechText = '';
        if (correspondingTranscriptLine && correspondingTranscriptLine.style.color === 'green') {
            speechText = correspondingTranscriptLine.getAttribute('data-saved').trim();
        }

        text += (index + 1) + '\t' + marker.timecode + '\t' + marker.description + ' '.repeat(maxNoteLength - marker.description.length + 1) + '\t' + marker.userName + '\t' + speechText + '\n'; // Marker.userName zur Ausgabe hinzufügen
    });

    text += '\n\n-------------- AUFLISTUNG SPRECHERTEXT -------------\n\n' + extractSpeakerLines() + '\n\n--------------------- GESAMT TRANSKRIPT ---------------------\n\n';

    // Exportiert Transcript
    var transcriptState = Array.from(document.querySelectorAll('#transcriptContainer p, #transcriptContainer textarea'))
    .map(p => ({ 
        text: p.textContent || p.value,  
        dataTime: p.getAttribute('data-time'), 
        dataSpeaker: (p.getAttribute('data-speaker') === 'true') 
    }));
    text += exportTranscript(transcriptState);

    var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = nameWithoutExtension + '_Anmerkungen_Liste.txt';
    a.click();
    window.URL.revokeObjectURL(url);
}

function extractSpeakerLines() {
    var speakerText = '';
    document.querySelectorAll('#transcript p').forEach(p => {
        if (p.style.color === 'green') { // Prüfen, ob die Zeile ein Sprechertext ist 
            p.setAttribute('data-speaker', 'true'); // Markieren Sie die Zeile als Sprechertext
            var timecode = convertTimeToHrsMinsSecs(parseFloat(p.getAttribute('data-time')));
            speakerText += timecode + '\n' + p.getAttribute('data-saved') + '\n\n';
        }
    });
    return speakerText;
}


function convertTimeToHrsMinsSecs(timeInSeconds) {
    var hours = Math.floor(timeInSeconds / 3600);
    timeInSeconds %= 3600;
    var minutes = Math.floor(timeInSeconds / 60);
    var seconds = Math.floor(timeInSeconds % 60);
    return (hours > 0 ? hours.toString().padStart(2, '0') + ":" : "") + 
            minutes.toString().padStart(2, '0') + ":" + 
            seconds.toString().padStart(2, '0');
}

function createScreenshot(index) {
    
    drawingPaths = [];

     function createScreenshot(index) {
         if (markers[index].canvas && markers[index].canvas.dispose) {
             try {
                 markers[index].canvas.dispose();
             } catch (error) {
                 console.error('Error disposing canvas:', error);
             } finally {
                 markers[index].canvas = null;
             }
         }
     
         // Der Rest deines Codes ...
     }
 
     // Setzt die aktuelle Zeit des Videos auf die Markerposition und pausiert das Video
     videoElement.currentTime = markers[index].timeInSeconds;
     videoElement.pause();
     currentMarkerIndex = index;
 
     // Sobald das Video die Markerposition erreicht hat, erstellen wir den Screenshot
     videoElement.onseeked = function() {
         var canvas = document.createElement('canvas');
         var context = canvas.getContext('2d');
 
         canvas.width = videoElement.videoWidth;
         canvas.height = videoElement.videoHeight;
         context.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
 
         // Get the screenshot dataURL
         var imgSrc = canvas.toDataURL();
 
         // Fabric canvas
         markers[currentMarkerIndex].canvas = new fabric.Canvas('screenshotCanvas', { isDrawingMode: true });
         fabricCanvas = markers[currentMarkerIndex].canvas;
         fabricCanvas.freeDrawingBrush.width = 5;
         fabricCanvas.on('path:created', function(e) {
             drawingPaths.push(e.path);
         });
 
         fabricCanvas.setHeight(canvas.height);
         fabricCanvas.setWidth(canvas.width);
 
         fabricCanvas.clear();
 
 fabric.Image.fromURL(imgSrc, function(img) {
     img.scaleToWidth(1280);
 
     img.set({
         left: 0,
         top: 0
     });
 
     // Passt den Canvas an die Größe des Bildes an
     fabricCanvas.setWidth(img.width);
     fabricCanvas.setHeight(img.height);
 
     // Fügt das Bild zum Canvas hinzu und rendert es
     fabricCanvas.add(img);
     fabricCanvas.renderAll();
 
     
             // Zeige den Screenshot-Container
             document.getElementById("screenshotContainer").style.display = "block";
             document.getElementById("saveScreenshotButton").style.display = "block";
             document.getElementById("closeScreenshotButton").style.display = "block";
             document.getElementById("overlay").style.display = "block";
 
         });
 
         // Entfernt den Event-Listener, nachdem er einmal ausgeführt wurde
         videoElement.onseeked = null;
     }
 }
 
 function drawOnScreenshot(screenshotWindow, imgSrc) {
     // You need to include the Fabric.js library in your project
     var canvas = new fabric.Canvas('screenshotCanvas');
     fabric.Image.fromURL(imgSrc, function(img) {
         // add background image
         canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
             scaleX: canvas.width / img.width,
             scaleY: canvas.height / img.height
         });
 
         // add event listeners to enable drawing
         canvas.isDrawingMode = true;
         canvas.freeDrawingBrush.color = "#f00";
     });
     
     // Add buttons to screenshotWindow to allow user to choose between drawing and saving the screenshot
 
     // Button to toggle drawing
     var drawBtn = screenshotWindow.document.createElement("button");
     drawBtn.innerHTML = "Draw";
     drawBtn.onclick = function(){canvas.isDrawingMode = !canvas.isDrawingMode;};
     screenshotWindow.document.body.appendChild(drawBtn);
 
    // Button zum Speichern des Screenshots
    var saveBtn = screenshotWindow.document.createElement("button");
    saveBtn.innerHTML = "Screenshot speichern";
    saveBtn.onclick = function() {
        var link = screenshotWindow.document.createElement('a');
        link.download = "screenshot.png";
        link.href = canvas.toDataURL();
        screenshotWindow.document.body.appendChild(link);
        link.click();
        screenshotWindow.close();
    };
 
    screenshotWindow.document.body.appendChild(saveBtn);
    
 }
 
 function selectBrush(brush) {
     switch (brush) {
         case "Pencil":
             fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
             fabricCanvas.freeDrawingBrush.color = 'black';
             fabricCanvas.freeDrawingBrush.width = 5; 
             fabricCanvas.isDrawingMode = true;
         default:
             console.log("Unbekannter Zeichenmodus.");
     }
 }
 
 function setBrushColor(color) {
     // Change the color of brush
     if(fabricCanvas.isDrawingMode) {
         fabricCanvas.freeDrawingBrush.color = color;
     }
 }
 
 document.getElementById('brushSize').oninput = function() {
     var fabricCanvas = markers[currentMarkerIndex].canvas;
     if(fabricCanvas) {
         setBrushWidth(this.value);
     }
 }
 
 function setBrushWidth(width) {
     var fabricCanvas = markers[currentMarkerIndex].canvas;
     if(fabricCanvas && fabricCanvas.isDrawingMode) {
         fabricCanvas.freeDrawingBrush.width = parseInt(width, 10) || 1;
         fabricCanvas.renderAll();
     }
 }
 
 
 
 function undoDrawing() {
     if (drawingPaths.length > 0) {
         var lastPath = drawingPaths.pop();
         fabricCanvas.remove(lastPath);
     }
 }
 
 function saveScreenshot() {
    var clipNameText = new fabric.Text('Clip Name: ' + videoFile, {
      left: 10,
      top: 10,
      fill: 'black',
      fontSize: 20,
      textBackgroundColor: 'white'
    });
    
    var markerText = new fabric.Text(
        'Timecode: ' + markers[currentMarkerIndex].timecode,
        {
            left: 10,
            top: 40,
            fill: 'black',
            fontSize: 20,
            textBackgroundColor: 'white'
        }
    );
    
    var noteText = new fabric.Text(
        'Anmerkung: ' + markers[currentMarkerIndex].description,
        {
            left: 10,
            top: 70,
            fill: 'black',
            fontSize: 20,
            textBackgroundColor: 'white'
        }
    );
    
    fabricCanvas.add(clipNameText);
    fabricCanvas.add(markerText);
    fabricCanvas.add(noteText);
    
    var group = new fabric.Group(fabricCanvas.getObjects());
    var boundingRect = group.getBoundingRect();
    
    var croppedImageDataURL = fabricCanvas.toDataURL({
      left: boundingRect.left,
      top: boundingRect.top,
      width: boundingRect.width,
      height: boundingRect.height,
    });
  
    markers[currentMarkerIndex].hasScreenshot = true;
    var date = new Date();
    var timestamp = "" + date.getFullYear() + ("0" + (date.getMonth() + 1)).slice(-2) + ("0" + date.getDate()).slice(-2) + ("0" + date.getHours()).slice(-2) + ("0" + date.getMinutes()).slice(-2) + ("0" + date.getSeconds()).slice(-2);
    markers[currentMarkerIndex].screenshotTime = timestamp;

    var a = document.createElement('a');
    a.href = croppedImageDataURL;

    var videoName = videoFile.split('.').slice(0, -1).join('.');
    a.download = `${videoName}_Timecode_${markers[currentMarkerIndex].timecode}_Screenshot_NR_${markers[currentMarkerIndex].screenshotTime}.png`;
    
    a.click();
  
    fabricCanvas.clear().renderAll();
    fabricCanvas.dispose();
    fabricCanvas = null;
    drawingPaths = [];
    
    document.getElementById("screenshotContainer").style.display = "none";
    document.getElementById("saveScreenshotButton").style.display = "none";
    document.getElementById("closeScreenshotButton").style.display = "none";
    document.getElementById("overlay").style.display = "none";
}
   document.addEventListener('DOMContentLoaded', (event) => {
 document.getElementById("closeScreenshotButton").addEventListener("click", closeScreenshot);
 });

 document.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOM fully loaded and parsed');
    document.getElementById("closeScreenshotButton").addEventListener("click", closeScreenshot);
   });
   
 function closeScreenshot() {
    console.log('Closing screenshot...');  // Zur Überprüfung ob die Funktion aufgerufen wird

    document.getElementById("screenshotContainer").style.display = "none";
    document.getElementById("closeScreenshotButton").style.display = "none";
    document.getElementById("overlay").style.display = "none";

    console.log('Current marker index:', currentMarkerIndex);  // Überprüfung des aktuellen Marker-Indexes
    console.log('Current marker:', markers[currentMarkerIndex]);  // Überprüfung des aktuellen Markers

    if (markers[currentMarkerIndex] && markers[currentMarkerIndex].canvas) {
        console.log('Disposing canvas...')  // Zur Bestätigung, dass diese Bedingung erfüllt ist

        markers[currentMarkerIndex].canvas.dispose();
        markers[currentMarkerIndex].canvas = null;
    }
}
 
 var paintingTools = document.querySelectorAll('.station');
 paintingTools.forEach(function(tool) {
     tool.addEventListener('click', function(e) {
         // Entferne die ausgewählte Klasse von allen Werkzeugen
         paintingTools.forEach(function(tool) {
             tool.classList.remove('selected');
         });
         // Füge die ausgewählte Klasse zum angeklickten Werkzeug hinzu
         e.target.classList.add('selected');
     });
 });

 