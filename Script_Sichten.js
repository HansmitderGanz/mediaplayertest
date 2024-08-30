$(document).ready(function() {
    // Fade out the white overlay on page load
    $("#whiteOverlay").fadeOut(2000);
});

var markers = [];
var videoFile = '';
var videoElement;
var pendingParagraphIndex = 0;


// Globale Variable, die den Index des aktuellen Absatzes speichert
let currentParagraphIndex = 0;
let paragraphStartTime = 0;
let isSpeaking = false;
let lastSpokenText = null;
let paragraphBeingRead = false; // Neue Variable
let nextSpeakTime = Infinity;

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
});



function loadVideo(event) {
    var file = event.target.files[0];
    videoFile = file.name;
    var url = URL.createObjectURL(file);

    videoElement = document.getElementById("myVideo"); 
    videoElement.src = url;
    videoElement.load();
    markers = [];
    updateMarkerList();

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
            p.replaceWith(para);
            toggleEditButton.innerHTML = "Bearbeiten"; // Text ändern
        }
    });
}

function loadNewTranscriptFormat(transcriptDiv, content) {
  var matches = content.matchAll(
    /([\t\s]*\d{2}:\d{2}(?: - SPRECHER)?)([\s\S]*?)(?=\n[\t\s]*\d{2}:\d{2}|$)/g
  );

  for (let match of matches) {
    var timestamps = match[1].trim();
    var text = match[2].trim();
    const p = document.createElement("p");

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
    };
    reader.readAsText(file, 'UTF-8');
}

function timecodeToSeconds(timecode) {
    var parts = timecode.split(':');
    return parts[0] * 3600 + // Stunden
           parts[1] * 60 + // Minuten
           parts[2] * 1; // Sekunden
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
      button.innerHTML = "&#8963;"; // Pfeil-nach-oben Symbol
  } else {
      shortcutsDiv.style.display = "none";
      button.innerHTML = "&#8964;"; // Pfeil-nach-unten Symbol
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

    var timecode = convertTimeToTimecode(currentTime, 25);
    markers.push({timeInSeconds: currentTime, timecode: timecode, description: description});

    // Wenn Marker hinzugefügt wird, #markerListContainer sichtbar machen
    document.getElementById('markerListContainer').style.display = 'block';

    updateMarkerList();
}

function updateMarkerList() {
    var markerList = $('#markerList');
    markerList.empty();

    // Überprüfen, ob alle Marker gelöscht wurden
    if (markers.length === 0) {
        document.getElementById('markerListContainer').style.display = 'none';
    } else {
        markers.forEach(function(marker, index) {
            var listItem = $('<li></li>');
            var jumpButton = $('<button style="margin-right: 10px;">Gehe zu</button>');
            jumpButton.click(function(){
                videoElement.currentTime = marker.timeInSeconds;
            });
            listItem.text('Timecode: ' + marker.timecode + ', Anmerkung: ' + marker.description);
            listItem.prepend(jumpButton);
            var actionSelect = $('<select class="actionSelect" onchange="handleMarkerActions(this, ' + index + ')" style="margin-left:1px; margin-top: 4px; padding: 5px 7px; border-radius: 8px; cursor: pointer;"><option selected disabled>Aktionen</option><option value="edit">Anmerkung ändern</option><option value="delete">Löschen</option></select>');
            listItem.append(actionSelect);
            markerList.append(listItem);
        });
    }
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

        updateMarkerList();
    };
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


function exportTranscript(transcriptState) {
    var text = '';

    transcriptState.forEach(function(line) {
        text += line.text + '\n\n';
    });

    return text;
}

function exportTable(userName) {
    var nameWithoutExtension = videoFile.replace(/\.[^/.]+$/, "");

    // Exportiert Markerliste
    var text = 'Sichtungsname: ' + nameWithoutExtension + '\nSichtung durch: ' + userName + '\n\nNummer\tTimecode\tAnmerkung\n';
    markers.forEach(function(marker, index) {
        text += (index + 1) + '\t' + marker.timecode + '\t' + marker.description + '\n';
    });

    // Trennung zwischen den Exportteilen
    text += '\n\n----------\n\n';

    // Exportiert Transcript
    var transcriptState = Array.from(document.querySelectorAll('#transcriptContainer p, #transcriptContainer textarea'))
        .map(p => ({ text: p.textContent || p.value,  dataTime: p.getAttribute('data-time') }));
    text += exportTranscript(transcriptState);

    var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = nameWithoutExtension + '_Anmerkungen_Tabelle.txt';
    a.click();
    window.URL.revokeObjectURL(url);
}
