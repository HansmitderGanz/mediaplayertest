
$(document).ready(function() {
    // Fade out the white overlay on page load
    $("#whiteOverlay").fadeOut(2000);

    // setTimeout to ask for the user's name after the fade out transition is over
    setTimeout(function(){ 
        currentUserName = prompt("Bitte geben Sie Ihren Namen ein");
    }, 2000);
    

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
var drawingPaths = [];
let currentUserName = '';

function loadVideo(event) {
    console.table(markers);  // Debug log hier
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
        startTC = prompt('Bitte Treffen sie eine Auswahl! \n-------------------\nSchauen sie eine Rohmaterial Sequenz mit Start-Timecode 00:00:00:00 = Bestätigen Sie mit ENTER/OK.\n-------------------\nSchauen sie einzel Rohmaterial Clips = Bitte geben Sie den im Video angezeigten Start-Timecode ein (im Format HH:MM:SS:FF)', '00:00:00:00');
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
        document.querySelectorAll('#markerList li').forEach((markerItem, index) => {
            // Marker-Zeit
            let markerTime = markers[index].timeInSeconds;
            if(Math.abs(currentTime - markerTime) <= 1) {
                markerItem.style.border = '2px solid #673AB7';
                markerItem.style.borderRadius = '5px'; // Zusätzlicher Stil
            } else if (Math.abs(currentTime - markerTime) > 2 && markers[index].source === 'user') {
                markerItem.style.border = 'none'; // Entfernt die Hervorhebung, wenn wir uns vom aktuellen Marker entfernt haben
            }
        });
    });
    
    markers = [];
    updateMarkerList();
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

var fabricCanvases = [];
var currentMarkerIndex;


function setMarker() {
    var currentTime = videoElement.currentTime;
    var description = '';

    do {
        description = prompt("Please enter a description for the marker");
        if (description === null) {
            return;
        }
    } while(description.trim() === '');

    // Die aktuelle Zeit des Videos wird zur Basiszeit addiert, um den Timecode zu berechnen
    var timecode = convertTimeToTimecode(baseTimecodeInSeconds + currentTime, 25);
    markers.push({timeInSeconds: currentTime, timecode: timecode, description: description, source: 'user', userName: currentUserName })
    
    console.log("Setting marker at time: ", currentTime);
    console.log("Calculated timecode: ", timecode);

    updateMarkerList();

    // Create the screenshot button
    var screenshotBtn = document.createElement("button");
    screenshotBtn.innerText = "Create Screenshot";
    screenshotBtn.onclick = createScreenshot;
}

function updateMarkerList() {
    var markerList = $('#markerList');
    markerList.empty();

  // Sortiert die Markierungen in chronologischer Reihenfolge
  markers.sort((a, b) => {
    return a.timeInSeconds - b.timeInSeconds;
});

    markers.forEach(function (marker, index) {
        var markerTime = marker.timeInSeconds;
        var listItem = $('<li></li>');
        var jumpButton = $('<button class="interactable" style="margin-right: 10px;">Gehe zu</button>');
        jumpButton.click(function(){
            if (markerTime !== undefined) {
                console.log("Jumping to Timecode: ", marker.timecode); // Add `console.log()` to log the timecode.
                console.log("markerTime is: ", markerTime);
                videoElement.currentTime = marker.timeInSeconds;
                if (marker.source === 'edl') {  // Check if the source is 'edl'
                    marker.visited = true;  // Add a new property `visited`
                    updateMarkerList();  // Update the marker list after setting `visited`
                }
            } else {
                console.log("No marker to jump to"); // Log when there's no marker to jump to.
            }
        });
        // Check the marker's source and format the list item text accordingly
        var listItemText = marker.source === 'edl' ?
            'TC: ' + marker.timecode + ' - Clip: ' + marker.description + ' - ' + marker.userName :
            'TC: ' + marker.timecode + ' - Anmerkung: ' + marker.description + ' - ' + marker.userName;
        listItem.text(listItemText);
        listItem.prepend(jumpButton);
        var actionSelect = $('<select class="actionSelect" onchange="handleMarkerActions(this, ' + index + ')" style="margin-left:1px; margin-top: 4px; padding: 5px 7px; border-radius: 8px; cursor: pointer;"><option selected disabled>Bearbeiten</option><option value="edit">Anmerkung ändern</option><option value="delete">Löschen</option><option value="screenshot">Screenshot</option></select>');
        listItem.append(actionSelect);

        if (marker.hasScreenshot) {
            listItem.append(' - siehe Screenshot NR ' + marker.screenshotTime);
        }

        if (marker.source === 'edl') {
            listItem.addClass('edl-marker');
            if (marker.visited) {  // Check if the marker has been visited
                listItem.css("opacity", "0.5");
            }
        } else {
            listItem.addClass('user-marker');
            // fügt einen Tabulator vor dem Textinhalt hinzu
            listItem.css('text-indent', '30px');
        }

        listItem.css("margin-bottom", "10px");
        markerList.append(listItem);
    });

    console.log(markerList);  // Debug log here
}



function handleMarkerActions(selectElem, index) {
    var selectedOption = selectElem.value;
    if (selectedOption === 'edit') {
        var newDescription = prompt("Bitte geben Sie eine neue Anmerkung ein");
        markers[index].description = newDescription;
        updateMarkerList();
    } else if (selectedOption === 'delete') {
        var reallyDelete = confirm("Möchten Sie wirklich die Anmerkung von " + markers[index].userName + " löschen?");
        if (reallyDelete) {
            markers.splice(index, 1);
            updateMarkerList();
        }
    } else if (selectedOption === 'screenshot') {
        createScreenshot(index);
    }    
    selectElem.selectedIndex = 0; // Reset the dropdown
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

    // Erzeugt ein neues Datum und formatiert es als tt.mm.jjjj
    var date = new Date();
    var dateFormatted = ('0' + date.getDate()).slice(-2) + '.' + ('0' + (date.getMonth()+1)).slice(-2) + '.' + date.getFullYear();

    var text = '';
    markers.forEach(function(marker, index) {
        text += 'Sichtungsanmerkung ' + dateFormatted + '\t' + marker.timecode + '\tTC\tred\t' + marker.description + (marker.hasScreenshot ? ' - s. Screenshot NR' + marker.screenshotTime + '' : '') + ' (gesetzt von ' + marker.userName + ')\t2\t\n';
    });

    var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    url = window.URL.createObjectURL(blob);
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
    } else if (selectedOption === 'loadEDL') {
        document.getElementById('loadEDLFile').click();
    } else if (selectedOption === 'loadMarkerList') {
        document.getElementById('loadMarkerListFile').click();
    }
    selectElem.selectedIndex = 0; // Reset the dropdown
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
    a.download = videoFile.replace(/\.[^/.]+$/, "") + "_99proMP_Vorschnitt" + "_Speicherstand_" + dateString + ".txt";
    a.click();
    window.URL.revokeObjectURL(url);
}

function loadMarkers(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = async function(e) {
        var content = e.target.result;
        try {
            markers = JSON.parse(content);
            console.table(markers);  // Debug log hier
            await updateMarkerList();
        } catch (error) {
            console.error("Fehler beim Parsen des Speicherstands:", error);
        }
    }
    reader.readAsText(file);

    // Hier setzen wir das Eingabefeld zurück
    event.target.value = null;
}

// Datei-Input-Button erstellen
var loadMarkerListButton = document.createElement('input');
loadMarkerListButton.setAttribute('type', 'file');
loadMarkerListButton.setAttribute('id', 'loadMarkerListFile');
loadMarkerListButton.style.display = 'none';
document.body.appendChild(loadMarkerListButton);

// Funktion zum Laden der Markerliste
function loadMarkerList(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        var content = e.target.result;
        
        var lines = content.split('\n');
        // Initialisiere markers als leeren Array
        markers = [];
        lines.forEach(function(line) {
            var parts = line.split('\t');

            // Überprüfe ob alle Teile existieren
            if (parts.length < 5) {
                console.log('Unerwartete Zeilenstruktur, weniger als 5 Elemente: ', line);
                return;
            }
        
            var timecode = parts[1];
            var description = parts[4].split(' (gesetzt')[0];
            var userName = parts[4].split(' ')[parts[4].split(' ').length-1].slice(0, -1);
            var source = description.startsWith('Clip: ') ? 'edl' : 'user';
            var timeInSeconds = timecodeToSeconds(timecode) - baseTimecodeInSeconds;

            markers.push({
              timeInSeconds: timeInSeconds,
              timecode: timecode,
              description: description,
              source: source,
              userName: userName
            });
        });

        updateMarkerList();
    }

    reader.readAsText(file);

    // Setzt das Eingabefeld zurück
    event.target.value = null;
}

// Verknüpft die Funktion mit dem 'MarkerListe importieren' Button
document.getElementById('loadMarkerListFile').addEventListener('change', loadMarkerList);

function handleExportOptions(selectElem) {
    var selectedOption = selectElem.value;

    if (selectedOption === 'markers') {
        exportMarkers();
    } else if (selectedOption === 'table') {
        exportTable();
    }
    selectElem.selectedIndex = 0;
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
    + '\nSichtungsdatum: ' + todayDate; 

    var transcriptLines = Array.from(document.querySelectorAll('#transcript p'));

    // Findet die längste Anmerkung zuerst
    var maxNoteLength = 0;
    markers.forEach(function(marker) {
        var fullDescription = marker.description + (marker.hasScreenshot ? ' - siehe Screenshot NR' + marker.screenshotTime : '');
        if (fullDescription.length > maxNoteLength) {
            maxNoteLength = fullDescription.length;
        }
    });

    var noteHeader = 'Anmerkung';
    var userHeader = 'angemerkt von'; 
    let repeatCount = Math.max(0, maxNoteLength - noteHeader.length + 2);
    text += '\n\nNummer\tTimecode\t' + noteHeader + ' '.repeat(repeatCount) + '\t' + userHeader + '\n';

    markers.forEach(function(marker, index) {
        var correspondingTranscriptLine = transcriptLines.find(p => {
            return Math.abs(parseFloat(p.getAttribute('data-time')) - marker.timeInSeconds) <= 1;
        });

        var fullDescription = marker.description + (marker.hasScreenshot ? ' - siehe Screenshot NR' + marker.screenshotTime : '');
        text += (index + 1) + '\t' + marker.timecode + '\t' + fullDescription + ' '.repeat(maxNoteLength - fullDescription.length + 2) + '\t' + marker.userName + '\n';
    });

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

function togglePlayPause() {
    var videoElement = document.getElementById("myVideo");
    if (videoElement.paused || videoElement.ended) {
        videoElement.play();
    } else {
        videoElement.pause();
    }
}

function deleteEdlMarkers(){
    let confirmDeletion = window.confirm("Möchten Sie die EDL-Markierungen wirklich löschen?");

    if(confirmDeletion) {
        markers = markers.filter(marker => marker.source !== 'edl');
        updateMarkerList();
    } else {
        // Aktion abgebrochen
        console.log("Löschvorgang abgebrochen!");
    }
}

var faqModal;
function openFAQs() {
    
    // Erstellen Sie ein Modalfenster
    var modal = document.createElement('div');
    modal.className = 'faq-modal';
    modal.style.position = 'fixed';
    modal.style.zIndex = 1;
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.overflow = 'hidden'; // Nehmen Sie overflow:hidden statt overflow:auto, um das Scrollen zu verhindern
    modal.style.backgroundColor = 'rgba(0,0,0,0.4)';

    // Erstellen Sie einen Container für die FAQs
    var container = document.createElement('div');
container.style.overflow = 'auto';
container.style.backgroundColor = '#fefefe';
container.style.margin = '5% auto';
container.style.padding = '20px';
container.style.border = '1px solid #888';
container.style.width = '80%';
container.style.maxHeight = '70%'; // Stellen Sie maxHeight für den Container ein
modal.appendChild(container);



// Erstellen Sie den Inhalt des Modals
faqs.forEach(function (faq, index) {
    var faqElement = document.createElement('div');
    faqElement.setAttribute('data-question', faq.frage); // Setzen Sie das 'data-question' Attribut
    faqElement.className = 'faq'; // Fügen Sie diese Linie hinzu
    faqElement.innerHTML = '<h3>' + (index + 1) + '. <b>' + faq.frage + '</b></h3><p>Antwort: ' + faq.antwort + '</p>';
    container.appendChild(faqElement);
});

    // Fügen Sie einen Schließen-Button hinzu, der sich oben rechts befindet
    var closeButton = document.createElement('button');
    closeButton.textContent = 'Schließe FAQs';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '0';
    closeButton.style.right = '0';
    closeButton.addEventListener('click', function () {
        document.body.removeChild(modal);
    });
    modal.appendChild(closeButton);

    // Erstellen Sie ein Input-Feld für die Suche
var searchInput = document.createElement('input');
searchInput.placeholder = 'Suche...';
searchInput.style.width = '100%';
searchInput.addEventListener('input', function() {
    var searchText = searchInput.value.toLowerCase(); // Text im Eingabefeld
    var faqElements = modal.getElementsByClassName('faq'); // Alle FAQ Elemente im modal

    for (var i = 0; i < faqElements.length; i++) {
        var faq = faqElements[i];
        var question = faq.getAttribute('data-question').toLowerCase(); // Frage für dieses FAQ Element

        // Überprüft, ob der Suchtext in der Frage enthalten ist
        if (question.includes(searchText)) {
            faq.style.display = ''; // Zeigt das FAQ Element an
        } else {
            faq.style.display = 'none'; // Versteckt das FAQ Element
        }
    }
});
container.insertBefore(searchInput, container.firstChild); // Änderungen hier

modal.appendChild(container);

    document.body.appendChild(modal);
}

var faqs = [
    { frage: 'Wie benutze ich den Video-Player?', antwort: 'Sie können auf Play klicken oder die Leertaste drücken, um das Video abzuspielen und zu pausieren. Verwenden Sie die linken und rechten Pfeiltasten, um vorwärts und rückwärts zu spulen.' },
    { frage: 'Wie füge ich Marker hinzu?', antwort: 'Drücken Sie "m" auf Ihrer Tastatur, um einen Marker hinzuzufügen.' },
    { frage: 'Warum wird mein Transkript nicht angezeigt?', antwort: 'Für diesen Player müssen die Transkripte in Trint erstellt werden. Exportieren Sie das Transkript als Avid Subtitle Datei im .txt Format.' },
    { frage: 'Warum wird mein Sprechertext nicht grün markiert?', antwort: 'Bei der Transkripterstellung in Trint müssen Sprechertexte die Zuordnung "Sprechertext" erhalten. Ist das nicht der Fall, so werden sie vom Player nicht als Sprechertext erkannt.' },
    { frage: 'Kann ich meine Arbeit speichern und an einem anderen Tag weitermachen?', antwort: 'Ja, Sie können über das Dropdown-Menü "Stand Speichern / Laden" die Aktion "Stand speichern" auswählen. Der Player speichert nun eine .txt-Datei auf Ihrem Rechner, die Ihren aktuellen Speicherstand darstellt. Beim erneuten Öffnen oder Neuladen des Players können Sie nun über dasselbe Dropdown-Menü Ihren Speicherstand laden. Wählen Sie dazu die Option "Speicherstand laden", wählen Sie die .txt-Datei aus und bestätigen Sie Ihre Auswahl.' },
    { frage: 'Kann ich meinen Speicherstand an jemand anderen weitergeben?', antwort: 'Ja, Sie können Ihren Speicherstand auch an eine andere Person weitergeben. Diese Person kann dann die Speicherstand .txt im Player laden und mit Ihrem Speicherstand weiterarbeiten.' },
    { frage: 'Warum muss ich meinen Namen eingeben?', antwort: 'Die Abfrage des Namens erfolgt, um anzuzeigen welche Person eine entsprechende Anmerkung oder Bearbeitung durchgeführt hat. Bei Fragen oder Unklarheiten ist damit sofort ein Ansprechpartner oder Ansprechpartnerin erkennbar.' },
    { frage: 'Warum gibt es dieses mega Tool erst jetzt?', antwort: 'Gute Frage, das muss ich mal an die KI weitergeben.Weitere Informationen finden Sie <a href="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYm81dmUzY2V1ZWhwMGV2dndoNmxqZzhqOGFqY2NiemM0b2c4czF1biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kE6xCyOOHoxlS/giphy.webp" target="_blank">hier</a>.' },
    { frage: 'Kann ich auch für Microsoft Word exportieren?', antwort: 'Der Player bietet zum jetzigen Zeitpunkt nur die Möglichkeit eine .txt-Datei zu exportieren. Die Inhalte müssen dann außerhalb des Players in Microsoft Office übertragen werden.' },
    // Fügen Sie so viele Fragen und Antworten hinzu, wie Sie möchten
];

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
    else if (event.key === '/'){  // Hinzugefügt code zum Einholen des Timecode
        event.preventDefault();
        var input = prompt("Bitte geben Sie den Timecode ein, zu dem Sie springen möchten (im Format HH:MM:SS:FF)");
        
        if (input === null || input === "") { 
          alert("Sie müssen einen gültigen Timecode eingeben");
        } else {
          var seconds = timecodeToSeconds(input);
          videoElement.currentTime = seconds - baseTimecodeInSeconds;
        }
     }
    else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (event.altKey) {
            rewind(1/25); // 1 Frame zurück
        } else {
            rewind(5); // 5 Sekunden zurück
        }
    }
    else if (event.altKey && event.key === 'f') { // `ALT + F` 
        event.preventDefault();

        var faqModal = document.querySelector('.faq-modal');
        if (faqModal) {
            document.body.removeChild(faqModal);
        } else {
            openFAQs();
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

window.addEventListener('keydown', function(event) {
    switch (event.key) {
        case "Alt":
            break;
        case "t":
        case "T":
            if (event.altKey) {
                var newTimecode = prompt("Bitte geben Sie den neuen Start-Timecode ein (im Format HH:MM:SS:FF):");
                if (newTimecode !== null) {
                    adjustStartTC(newTimecode);
                }
            }
            break;
        default:
            break;
    }
});


function adjustStartTC(newStartTC) {
    var newBaseTimecodeInSeconds = timecodeToSeconds(newStartTC);
    var offset = newBaseTimecodeInSeconds - baseTimecodeInSeconds; // Offset berechnen

    baseTimecodeInSeconds = newBaseTimecodeInSeconds; // Basis-Timecode aktualisieren

    // Aktualisieren Sie die timecode aller Marker ohne die Alteration der timeInSeconds
    markers.forEach(function(marker) {
        marker.timecode = convertTimeToTimecode(marker.timeInSeconds + newBaseTimecodeInSeconds, 25);
    });

    updateMarkerList();
}


window.addEventListener('keydown', function(event) {
    if (document.activeElement.nodeName === 'INPUT') {
        return;
    }
    if (event.key === 'e' || event.key === 'E') {
        Epressed = true;
    }
    else if (event.key === 'Delete') {
        if(Epressed){
            deleteEdlMarkers();
        }
    }
    else {
        Epressed = false;
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

window.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.altKey && event.key === 'g') {
        startGame(); // Sie müssen diese Funktion implementieren
    }
});

// Hier ist Ihre StartGame Funktion, die ein neues Fenster öffnet und ein HTML-Spiel lädt.
function startGame() {
    let gameWindow = window.open("Game/memorie.html", "Spielefenster", "height=600,width=800");
}

var transcriptWindow = document.getElementById('draggableTranscript'),
    transcriptHeader = document.getElementById('transcriptHeader'),
    offsetX = 0, offsetY = 0,
    mouseIsDown = false;

transcriptHeader.addEventListener('mousedown', function(e) {
    offsetX = transcriptWindow.offsetLeft - e.clientX;
    offsetY = transcriptWindow.offsetTop - e.clientY;
    mouseIsDown = true;
}, true);

document.addEventListener('mouseup', function() {
    mouseIsDown = false;
}, true);

document.addEventListener('mousemove', function(e) {
    if(mouseIsDown) {
        transcriptWindow.style.left = (e.clientX + offsetX) + 'px';
        transcriptWindow.style.top = (e.clientY + offsetY) + 'px';
    }
}, true);


var pin = document.getElementById('transcriptHeader');

pin.addEventListener('mousedown', function() {
    pin.style.fontSize = '30px';
});

pin.addEventListener('mouseup', function() {
    pin.style.fontSize = '20px';
});



function createScreenshot(index) {
    
   drawingPaths = [];
 
    // Check if a canvas instance already exists
    function createScreenshot(index) {
        // Überprüfe ob ein Canvas existiert
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

function setBrushWidth(width) {
    // change the width of brush
    if(fabricCanvas.isDrawingMode) {
        fabricCanvas.freeDrawingBrush.width = width;
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
    a.download = `${videoName}_TC_${markers[currentMarkerIndex].timecode}_Screenshot_NR_${markers[currentMarkerIndex].screenshotTime}.png`;
    
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

document.getElementById("closeScreenshotButton").addEventListener("click", closeScreenshot);

function closeScreenshot() {
    document.getElementById("screenshotContainer").style.display = "none";
    document.getElementById("closeScreenshotButton").style.display = "none";
    document.getElementById("overlay").style.display = "none";

    markers[currentMarkerIndex].canvas.dispose(); // Use fabric's built-in dispose function before nulling off the object
    markers[currentMarkerIndex].canvas = null;    //  Set to null, entirely de-referencing the fabric canvas object and releasing it for garbage collection
}


// 1. Datei-Input-Button erstellen
var loadEDLButton = document.createElement('input');
loadEDLButton.setAttribute('type', 'file');
loadEDLButton.setAttribute('id', 'loadEDLFile');
loadEDLButton.style.display = 'none';
loadEDLButton.addEventListener('change', loadEDL);
document.body.appendChild(loadEDLButton);

// 2. Funktion zum Laden und Auslesen der EDL-Datei
function loadEDL(event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    
    reader.onload = async function(e) {
        var content = e.target.result;

        // Normalisiere die Zeilenumbrüche
        content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Marker aus EDL-Inhalt extrahieren
        var extractedMarkers = extractMarkersFromEdlContent(content);
        console.log('Extracted markers', extractedMarkers); // Debug log hier
        
        // Extrahierte Marker zur Marker-Liste hinzufügen
        markers = [...markers, ...extractedMarkers];
        
        await updateMarkerList();
    }

    reader.readAsText(file);
    // Resets the input field
    event.target.value = null;
}


function extractMarkersFromEdlContent(content) {
    // Marker-Liste
    var markers = [];

    // EDL-Inhalte Zeile für Zeile durchlaufen
    var lines = content.split('\n');

    // Regex to match the desired format and capture the timecode and clip name
    var re = /(\d{2}:\d{2}:\d{2}:\d{2})\s+\d{2}:\d{2}:\d{2}:\d{2}\s+(.+)/;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var match = line.match(re);

        // Wenn die Zeile mit dem gewünschten Format übereinstimmt
        if (match) {
            var startTimeCode = match[1];
            var clipName = match[2];

            var startTimeInSeconds = timecodeToSeconds(startTimeCode);
            var timeForMarker = startTimeInSeconds - baseTimecodeInSeconds;

            // Neuer Marker erstellen
            var newMarker = {
                timeInSeconds: timeForMarker,
                description: clipName,
                timecode: startTimeCode,
                userName: currentUserName ? currentUserName : 'Unbekannter Benutzer',
                source: 'edl',
            };

            // Überprüfen, ob der Marker bereits in der Liste ist
            var markerExists = markers.some(marker => 
                marker.timeInSeconds === newMarker.timeInSeconds &&
                marker.description === newMarker.description &&
                marker.timecode === newMarker.timecode &&
                marker.userName === newMarker.userName
            );

            // Marker zur Liste hinzufügen, wenn er noch nicht vorhanden ist
            if (!markerExists) {
                markers.push(newMarker);
            }
        }
    }

    // Rückgabe der gefilterten Marker-Liste
    return markers;
}








