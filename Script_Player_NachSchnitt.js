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
        evt.preventDefault();
        var files = evt.dataTransfer.files;
        if (files && files.length > 0) {
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

    $( ".draggable" ).draggable();
    
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
var isLooping = false;



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


// Fügen Sie eine Kontrollvariable hinzu, um zu prüfen, ob das FAQ-Fenster offen oder geschlossen ist
var isFAQOpen = false;


window.addEventListener('keydown', function(evt) {
    if (evt.key === "t" && evt.altKey) {
        let focusedElem = document.activeElement;
        if (focusedElem && focusedElem.tagName.toLowerCase() === 'textarea') {
            if (editMode) {
                var newTimecode = prompt("Bitte geben Sie den neuen Timecode im Format HH:MM:SS:FF ein");
                if (newTimecode !== null) {
                    var newTimeInSeconds = timecodeToSeconds(newTimecode);
                    if (!isNaN(newTimeInSeconds)) {
                        focusedElem.setAttribute("data-time", newTimeInSeconds);
                    } else {
                        alert("Ungültiger Timecode eingegeben. Bitte geben Sie einen gültigen Timecode im Format HH:MM:SS:FF ein.");
                    }
                }
            }
        }
    }
}, false);

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
    else if (event.altKey && event.key === 'f') { // `ALT + F` 
        event.preventDefault();

        var faqModal = document.querySelector('.faq-modal');
        if (faqModal) {
            document.body.removeChild(faqModal);
        } else {
            openFAQs();
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

window.addEventListener('keydown', function(event) {
    if (event.altKey && event.key === 'g') {
        startGame(); // Sie müssen diese Funktion implementieren
    }
});

// Hier ist Ihre StartGame Funktion, die ein neues Fenster öffnet und ein HTML-Spiel lädt.
function startGame() {
    let gameWindow = window.open("Game/memorie.html", "Spielefenster", "height=600,width=800");
}

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

document.addEventListener("keydown", function(event) {
    if (event.altKey && (event.key == 'v')) {
        toggleTimecode();
    }
});

// Machen Sie den Zeitcode Container ("timecodeContainer") doppelklickbar.
document.getElementById('timecodeContainer').addEventListener('dblclick', function() {
    // Zugriff auf den Timecode
    var timecode = document.getElementById('timecode').textContent;
  
    // Erstellen Sie ein neues Textarea-Element
    var textarea = document.createElement('textarea');
    textarea.value = timecode;
  
    // Fügen Sie das Textarea-Element zu Ihrem Dokument hinzu
    document.body.appendChild(textarea);
  
    // Auswählen des Texts im Textarea-Element
    textarea.select();
  
    // Kopieren des ausgewählten Texts in die Zwischenablage
    document.execCommand('copy');
  
    // Entfernen des erstellten Textarea-Elementes
    document.body.removeChild(textarea);
  
    alert('Timecode wurde in die Zwischenablage kopiert!');
  });

  // Die Buttons 
var btnRight = document.getElementById('btnRight');
var btnLeft = document.getElementById('btnLeft');
var btnLoop = document.getElementById('btnLoop');

// EventListener die das Kopieren des Timecodes bei Doppelklick unterdrücken
btnRight.addEventListener('dblclick', function(event) {
    event.stopPropagation();
});

btnLeft.addEventListener('dblclick', function(event) {
    event.stopPropagation();
});
 
btnLoop.addEventListener('dblclick', function(event) {
    event.stopPropagation();
});

var video = document.getElementById('myVideo');
video.addEventListener('timeupdate', updateTimecode);

function toggleTimecode() {
    var container = document.getElementById('timecodeContainer');
    if (container.style.display === "none") {
        container.style.display = "block";
        updateTimecode();    
        console.log("Timecode is visible now");   // Added console log
    } else {
        container.style.display = "none";
        console.log("Timecode is hidden now");  // Added console log
    }
}

document.getElementById('myVideo').onloadedmetadata = function() {
    var fps = 25; // Frames per second
    var duration = this.duration;
    var hours = Math.floor(duration / 3600);
    var minutes = Math.floor((duration - (hours * 3600)) / 60);
    var seconds = Math.floor(duration - (hours * 3600) - (minutes * 60));
   
    // Calculate total number of frames for the current second
    var frames = Math.round((duration - Math.floor(duration)) * fps);

    // Format duration as HH:MM:SS:FF
    var formattedDuration = ("0" + hours).slice(-2) + ":" + 
                            ("0" + minutes).slice(-2) + ":" + 
                            ("0" + seconds).slice(-2) + ":" +
                            ("0" + frames).slice(-2);

    // Update the "duration" span
    document.getElementById('duration').textContent =formattedDuration;
};


function updateTimecode() {
    var video = document.getElementById('myVideo');
    var timecode = document.getElementById('timecode');
    var currentTime = video.currentTime;
    
    var hours = Math.floor(currentTime / 3600);
    var minutes = Math.floor((currentTime - (hours * 3600)) / 60);
    var seconds = Math.floor(currentTime - (hours * 3600) - (minutes * 60));
    
    var frames = Math.floor((currentTime % 1) * 25);  // calculate the frames

    // Format time as HH:MM:SS:FF
    var formattedTime = ("0" + hours).slice(-2) + ":" + ("0" + minutes).slice(-2) + ":"
                      + ("0" + seconds).slice(-2) + ":" + ("0" + frames).slice(-2);
    
    timecode.textContent = formattedTime;

    // Update the timecode as the video is playing
    if (!video.paused && !video.ended) {
        setTimeout(updateTimecode, 40);   // Lowering the interval to update frame number accordingly
    }
}   

document.getElementById('timecodeContainer').addEventListener('wheel', function(event) {
    event.preventDefault();
    
    var timecodeContainer = document.getElementById('timecodeContainer');
    var style = window.getComputedStyle(timecodeContainer, null);
    var fontSize = parseFloat(style.getPropertyValue('font-size'));
    
    if(event.deltaY < 0 && fontSize < 40) {
        // Vergrößern
        timecodeContainer.style.fontSize = (fontSize + 1) + 'px';
    }
    else if(event.deltaY > 0 && fontSize > 20) {
        // Verkleinern
        timecodeContainer.style.fontSize = (fontSize - 1) + 'px';
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
    var timecodeContainer = document.getElementById('timecodeContainer');
  timecodeContainer.style.fontSize = '20px';
    
    videoElement = document.getElementById("myVideo");
    videoElement.src = url;
    videoElement.load();
    $("#timecodeContainer").show();

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
    { frage: 'Wie kann ich die Wiedergabegeschwindigkeit eines Videos ändern?', antwort: 'Die Wiedergabegeschwindigkeit kann direkt im Playerfenster geändert werden.' },
    { frage: 'Kann ich Anmerkungen in einem Video setzen?', antwort: 'Ja, Sie können Marker setzen, diese werden dann in der Marker-Liste angezeigt.' },
    { frage: 'Ich sehe das Transkript nicht. Warum?', antwort: 'Überprüfen Sie das Kontrollkästchen Transkript anzeigen, um das Transkript anzuzeigen oder auszublenden.' },
    { frage: 'Wie kann ich das Transkript bearbeiten?', antwort: 'Klicken Sie auf die Schaltfläche "Bearbeiten", um das Transkript zu bearbeiten. Wenn Sie mit den Änderungen fertig sind, klicken Sie auf "Bearbeitung beenden".' },
    { frage: 'Wie kann ich zum vorherigen oder nächsten Marker springen?', antwort: 'Mit den Pfeiltasten Up (zum vorherigen Marker) und Down (zum nächsten Marker) können Sie zwischen den Markern navigieren.' },
    { frage: 'Was bedeutet das grüne Highlighting im Transkript?', antwort: 'Die grüne Hervorhebung im Transkript bedeutet, dass es sich um einen Sprechertext handelt.' },
    { frage: 'Wie wechsele ich den Zeichenmodus?', antwort: 'Sie können auf den Stift in der unteren rechten Ecke des Screenshots klicken und dann die Farbe und Größe des Stifts ändern.' },
    { frage: 'Kann ich meine Marker speichern und laden?', antwort: 'Ja, Sie können Ihre Marker über die Dropdown-Liste "Markeroptionen" speichern und laden.' },
    { frage: 'Wie erstelle ich einen Screenshot?', antwort: 'Um einen Screenshot zu erstellen, wählen Sie "Screenshot" aus der Dropdown-Liste bei einem Marker.' },
    { frage: 'Wie kann ich die Marker-Liste exportieren?', antwort: 'Die Marker-Liste kann über die Dropdown-Liste "Anmerkungen exportieren" exportiert werden.' },
    { frage: 'Was mache ich, wenn die Anwendung nicht reagiert?', antwort: 'Wenn die Anwendung nicht reagiert, aktualisieren Sie die Seite oder starten Sie Ihren Browser neu.' },
    { frage: 'Wie kann ich den Dunkelmodus ein- und ausschalten?', antwort: 'Klicken Sie auf den "Dunkelmodus ein/ausschalten"-Button in der oberen linken Ecke, um den Dunkelmodus ein- oder auszuschalten.' },
    { frage: 'Kann ich den Videoplayer im Hintergrund laufen lassen?', antwort: 'Ja, der Video-Player kann im Hintergrund laufen, solange das Browserfenster geöffnet ist.' },
    { frage: 'Kann ich meine Arbeit speichern und an einem anderen Tag weitermachen?', antwort: 'Ja, Sie können über das Dropdown-Menü "Stand Speichern / Laden" die Aktion "Stand speichern" auswählen. Der Player speichert nun eine .txt-Datei auf Ihrem Rechner, die Ihren aktuellen Speicherstand darstellt. Beim erneuten Öffnen oder Neuladen des Players können Sie nun über dasselbe Dropdown-Menü Ihren Speicherstand laden. Wählen Sie dazu die Option "Speicherstand laden", wählen Sie die .txt-Datei aus und bestätigen Sie Ihre Auswahl.' },
    { frage: 'Kann ich meinen Speicherstand an jemand anderen weitergeben?', antwort: 'Ja, Sie können Ihren Speicherstand auch an eine andere Person weitergeben. Diese Person kann dann die Speicherstand .txt im Player laden und mit Ihrem Speicherstand weiterarbeiten.' },
    { frage: 'Warum muss ich meinen Namen eingeben?', antwort: 'Die Abfrage des Namens erfolgt, um anzuzeigen welche Person eine entsprechende Anmerkung oder Bearbeitung durchgeführt hat. Bei Fragen oder Unklarheiten ist damit sofort ein Ansprechpartner oder Ansprechpartnerin erkennbar.' },
    { frage: 'Warum gibt es dieses mega Tool erst jetzt?', antwort: 'Gute Frage, das muss ich mal an die KI weitergeben. Weitere Informationen finden Sie <a href="https://www.youtube.com/watch?v=1P5yyeeYF9o" target="_blank">hier</a>.' },
    { frage: 'Kann ich auch für Microsoft Word exportieren?', antwort: 'Der Player bietet zum jetzigen Zeitpunkt nur die Möglichkeit eine .txt-Datei zu exportieren. Die Inhalte müssen dann außerhalb des Players in Microsoft Office übertragen werden.' },
    { frage: 'Kann ich den Zeitpunkt, oder das Timing eines Sprechertextes im nachhinein ändern?', antwort: 'Ja. Wählen sie beim Transkript den Bearbeitungsmodus. Klicken sie dann in das Sprechertextfeld, welches sie zeitlich neu anpassen möchten. Drücken sie nun die ALt + T Tasten gemeinsam. Es öffnet sich ein Fenster in welches Sie den neuen Start-Timecode des Textabschnittes eingeben können.' },
    { frage: 'Kann ich einen Transkripttext im Nachinein zu einem Sprechertext machen?', antwort: 'Ja. Wählen sie beim Transkript den Bearbeitungsmodus. Suchen sie den Textabschnitt, welchen sie zu einem Sprechertext umwandeln wollen und machen sie einen Doppelklick darauf. Es erscheint ein Fenster, in welchem sie die Umwandlung bestätigen müssen. Um den Sprechertext wieder zurück in einen normalen Text umzuwandeln, wiederholen sie den Vorgang.' },
    { frage: 'Warum kann ich keine Absätze im Transkript machen?', antwort: 'Bei der Sprachausgabe des Players wird immer nur der erste Absatz nach dem Timecode beachtet. Der gesammte Sprechertext eines Abschnittes ist daher in eine Zeile zu schreiben. Aus diesen Grund ist das Erstellen von Absätzen in der Transkript bearbeitung deaktiviert.' },
    // Fügen Sie so viele Fragen und Antworten hinzu, wie Sie möchten
];

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

// _________________________________________________________________________________________________________________________________________________________________

var inTime = null;
var outTime = null;
var inPointElement = document.getElementById('inPoint');
var outPointElement = document.getElementById('outPoint');
//var durationBetweenInOut = null; // Neu hinzugefügt
    var durationElement = document.getElementById('durationBetweenInOut'); // Neu hinzugefügt

    // Create enum-like object to track the current display point
    var DisplayPointEnum = {
        InPoint: 1,
        OutPoint: 2,
        Duration: 3
    };
    var currentDisplayPoint = DisplayPointEnum.InPoint; // Anfangspunkt ist In-Point

window.addEventListener('keydown', function(event) {

    // Referenzen auf HTML-Elemente erstellen
    var inPointElement = document.getElementById('inPoint');
    var outPointElement = document.getElementById('outPoint');
    var durationElement = document.getElementById('duration');
    
    
    // Überprüfen ob "i" oder "I" gedrückt wurde und setzen oder löschen Sie die In-Zeit
    if (event.key === 'i' || event.key === 'I') {
        if (inTime !== null) {
            console.log("In Punkt gelöscht");
            inTime = null;
            inPointElement.style.display = "none";
            
            if (outTime !== null) {
                gleichzeitigeAnzeige = 2; // Setze die Anzeige auf OUT-Punkt
                outPointElement.style.display = "inline"; // Zeige den OUT-Punkt an
            } 
            updateInOutDisplay(); // Aktualisiere die Anzeige
        } else {
            inTime = videoElement.currentTime;
            console.log("In Punkt gesetzt bei: ", inTime);

        // Aktualisieren der In-Punkt-Anzeige und Einblenden der Anzeige
        inPointElement.textContent = "In: " + convertTimeToTimecode(inTime, 25);
        inPointElement.style.display = "inline";
        currentDisplayPoint = DisplayPointEnum.InPoint;
    }
    toggleTimecodeButtons();
    updateDuration();

    // Verstecke die Dauer-Anzeige, wenn entweder In- oder Aus-Zeit gesetzt sind 
    if (inTime !== null) {
        // In-Punkt ist gesetzt, also zeigen wir das an
        inPointElement.style.display = "inline";
        // Da wir jetzt einen neuen In-Punkt haben, verstecken wir den Out-Punkt
        outPointElement.style.display = "none";
    } else {
        inPointElement.style.display = "none";
    }
}

    // Überprüfen ob "o" oder "O" gedrückt wurde und setzen oder löschen Sie die Aus-Zeit
    if (event.key === 'o' || event.key === 'O') {
        if (outTime !== null) {
            console.log("Out Punkt gelöscht");
            outTime = null;
            outPointElement.style.display = "none";

            // Überprüfen, ob der IN-Punkt gesetzt ist
        if (inTime !== null) {
            gleichzeitigeAnzeige = 0; // Setze die Anzeige auf IN-Punkt
            inPointElement.style.display = "inline"; // Zeige den IN-Punkt an
        }
        
        updateDuration(); // Dauer aktualisieren
        updateInOutDisplay(); // Aktualisiere die Anzeige
    

        } else {
            outTime = videoElement.currentTime;
            console.log("Out Punkt gesetzt bei: ", outTime);
            
        
            // Aktualisieren der Out-Punkt-Anzeige und Einblenden der Anzeige
            outPointElement.textContent = "Out: " + convertTimeToTimecode(outTime, 25);
            outPointElement.style.display = "none"; // Dies sollte anfänglich auf "none" gesetzt sein, um den In-Punkt anzuzeigen

            currentDisplayPoint = DisplayPointEnum.OutPoint;
        }
// Aktualisiert die Sichtbarkeit der Buttons
    toggleTimecodeButtons();
            updateDuration();
            
       // Verstecke die Dauer-Anzeige, wenn entweder In- oder Aus-Zeit gesetzt sind 
       if (outTime !== null) {
        // Out-Punkt ist gesetzt, also zeigen wir das an
        outPointElement.style.display = "inline";
        // Da wir jetzt einen neuen Out-Punkt haben, verstecken wir den In-Punkt
        inPointElement.style.display = "none";
    } else {
        outPointElement.style.display = "none";
    }
}

// Überprüfen, ob sowohl In-Zeit als auch Aus-Zeit gesetzt sind
if (inTime !== null && outTime !== null) {
    gleichzeitigeAnzeige = 1; // Setze die Anzeige zuerst auf die Dauer
    updateInOutDisplay(); // Aktualisiere die Anzeige
}

videoElement.ontimeupdate = function () {
    if (isLooping && inTime !== null && outTime !== null && currentDisplayPoint !== DisplayPointEnum.Duration) {
        if (videoElement.currentTime < inTime || videoElement.currentTime > outTime) {
            videoElement.currentTime = inTime;
        }
    }
};
    


    // Zeigen sie wieder die Dauer (und Dauer zwischen In- und Outpunkt) Anzeige an, wenn sowohl In- als auch Aus-Zeit gelöscht sind 
if (inTime == null && outTime == null) {
    durationElement.style.display = 'inline';
    //durationBetweenInOutElement.style.display = 'none'; 
} else {
    durationElement.style.display = 'none'; 
}
});






function updateDuration(){
    // Überprüfen, ob sowohl In-Zeit als auch Aus-Zeit gesetzt sind
    if (inTime !== null && outTime !== null) {
        durationBetweenInOut = outTime - inTime;
        durationElement.textContent = "I-O: " + convertTimeToTimecode(durationBetweenInOut, 25);
        // Überprüfen, ob der aktuelle Anzeigepunkt der 'Duration' Punkt ist
        if (currentDisplayPoint === DisplayPointEnum.Duration) {
            durationElement.style.display = "inline";
        }   
    } else {
        durationBetweenInOut = null;
        durationElement.style.display = "none";
    }
} 

// Definieren Sie eine Variable, um den aktuellen Anzeigepunkt zu speichern (0 = In-Punkt, 1 = Dauer, 2 = Aus-Punkt)
var gleichzeitigeAnzeige = 0;

// Button-Listener für den "Left" Button
document.getElementById('btnLeft').addEventListener('click', function () {
    gleichzeitigeAnzeige = (gleichzeitigeAnzeige + 2) % 3; // Nach links zyklisch verschieben
    updateInOutDisplay();
});

// Button-Listener für den "Right" Button
document.getElementById('btnRight').addEventListener('click', function () {
    gleichzeitigeAnzeige = (gleichzeitigeAnzeige + 1) % 3; // Nach rechts zyklisch verschieben
    updateInOutDisplay();
    
});


// Button Listener für den "Loop" Button
document.getElementById('btnLoop').addEventListener('click', function () {
    isLooping = !isLooping;  // Wechselt den Loop-Status jedes Mal, wenn der Button geklickt wird

    // Wenn das Looping aktiv ist und das Video gerade spielt, setzt der currentTime des Videos auf die inTime zurück
    if (isLooping && !videoElement.paused) {
        videoElement.currentTime = inTime;
    }

    if(isLooping) {
        this.textContent = '⏸️';  // Ein Emoji für den aktiven Loop-Status
    } else {
        this.textContent = '🔄';  // Das ursprüngliche Emoji für den inaktiven Loop-Status
    }
});



function loop() {
    if(isLooping && inTime !== null && outTime !== null) {  // Überprüfen Sie, ob der Loop aktiviert ist und ob In- und Out-Zeiten gesetzt sind
        videoElement.ontimeupdate = function(event) {
            // Schleifen Sie das Video zwischen In- und Aus-Zeit
            if (videoElement.currentTime >= outTime) {
                videoElement.currentTime = inTime;
            }
        }
    } else {
        // Deaktivieren Sie das Looping, wenn der Loop nicht aktiviert ist oder wenn eine der Zeiten gelöscht wird
        videoElement.ontimeupdate = null;
    }
}

function updateInOutDisplay() {
    // Verstecken Sie alle Elemente
    inPointElement.style.display = "none";
    outPointElement.style.display = "none";
    durationElement.style.display = "none";

    // Zeigen Sie das ausgewählte Element an
    switch (gleichzeitigeAnzeige) {
        case 0:
            inPointElement.style.display = "block";
            break;
        case 1:
            durationElement.style.display = "block";
            break;
        case 2:
            outPointElement.style.display = "block";
            break;
    }
}


function toggleTimecodeButtons() {
    var btnLoop = document.getElementById('btnLoop');
    var btnRight = document.getElementById('btnRight');
    var btnLeft = document.getElementById('btnLeft');
  
    if (inTime !== null && outTime !== null) {
        // Beide Punkte sind gesetzt, also die Buttons anzeigen
        btnLeft.style.display = 'block';
        btnRight.style.display = 'block';
        btnLoop.style.display = 'block';
    } else {
        // Mindestens ein Punkt ist nicht gesetzt, also die Buttons verstecken
        btnLeft.style.display = 'none';
        btnRight.style.display = 'none';
        btnLoop.style.display = 'none';
    }
}


// _________________________________________________________________________________________________________________________________________________________________




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
      /([\t\s]*\d{2}:\d{2}(?: - SPRECHER| - VO)?)([\s\S]*?)(?=\n[\t\s]*\d{2}:\d{2}|$)/g
    );
  
    for (let match of matches) {
      var timestamps = match[1].trim();
      var text = match[2].trim();
      const p = document.createElement("p");
      p.classList.add("interactable-transcript");
  
      var isSpeaker = timestamps.endsWith("- SPRECHER") || timestamps.endsWith("- VO");
  
      if (isSpeaker) {
        if (timestamps.endsWith("- SPRECHER")) {
          timestamps = timestamps.slice(0, timestamps.lastIndexOf(" - SPRECHER"));
        } else if (timestamps.endsWith("- VO")) {
          timestamps = timestamps.slice(0, timestamps.lastIndexOf(" - VO"));
        }
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
    console.log('updateMarkerList has been called');
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
        let markers = [];
    }
}

function handleMarkerActions(selectElem, index) {
    var selectedOption = selectElem.value;
    if (selectedOption === 'edit') {
        var oldDescription = markers[index].description; // Sichern Sie die alte Beschreibung
        var newDescription = prompt("Bitte geben Sie eine neue Anmerkung ein", oldDescription); // Geben Sie die alte Beschreibung als zweiten Parameter an
        if (newDescription !== null) {  // Überprüfen, ob der Benutzer das Prompt-Fenster nicht abgebrochen hat
            markers[index].description = newDescription;
        }
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
    } else if (selectedOption === 'loadMarkerList') {
        document.getElementById('loadMarkerListFile').click();
    }
    selectElem.selectedIndex = 0; // Reset the dropdown

}


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
    a.download = videoFile.replace(/\.[^/.]+$/, "") + "_99proMP_Vorschnitt" + "_Speicherstand_" + dateString + ".txt";
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
    console.log('loadMarkers has been called');
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
        console.log('File has been read'); 
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

        console.log('Markers and the transcript have been updated');

        // Show the marker list container if there are markers
        
        var markerListContainerElement = document.getElementById('markerListContainer');
        if (markers && markers.length > 0) {
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

        // Split the content into lines
        var lines = content.split('\n');

        // Initialize 'markers' as an empty array
        markers = [];
        
        lines.forEach(function(line) {
            var parts = line.split('\t');
            
            // Check if all parts exist
            if (parts.length < 5) {
                console.log('Unexpected line structure, less than 5 elements: ', line);
                return;
            }

            var marker = {
                timeInSeconds: parseFloat(parts[0]),
                timecode: parts[1],
                description: parts[2],
                userName: parts[3],
                // Interpret the string 'true' as true, and anything else as false
                hasScreenshot: parts[4].toLowerCase() === 'true' ? true : false,
            };
            markers.push(marker);
        });

        // Update the marker list after loading the markers
        updateMarkerList();
    };
    reader.readAsText(file);
}
        
          

// Verknüpft die Funktion mit dem 'MarkerListe importieren' Button
document.getElementById('loadMarkersFile').addEventListener('change', loadMarkerList);


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
    
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    var todayDate =  dd + '.' + mm + '.' + yyyy;
    
    var text = 'Dateiname: ' + nameWithoutExtension 
    + '\nSichtung durch: ' + currentUserName 
    + '\nSichtungsdatum: ' + todayDate;

    text += '\n\n-------------- AUFLISTUNG ANMERKUNGEN/SPRECHERTEXT -------------\n\n';
    var transcriptLines = Array.from(document.querySelectorAll('#transcript p'));
    var maxNoteLength = 0;
    
    markers.forEach(function(marker) {
        var fullDescription = marker.description + (marker.hasScreenshot ? ' - siehe Screenshot NR' + marker.screenshotTime : '');
        if (fullDescription.length > maxNoteLength) {
            maxNoteLength = fullDescription.length;
        }
    });

    var noteHeader = 'Anmerkung';
    var userHeader = 'gesetzt von'; 
    var speechHeaderText = 'Sprechertext';
    let repeatCount = Math.max(0, maxNoteLength - noteHeader.length + 2);
    text += 'Nummer\tTimecode\t' + noteHeader + ' '.repeat(repeatCount) + '\t' + userHeader + '\t' + speechHeaderText + '\n';

    markers.forEach(function(marker, index) {
        var correspondingTranscriptLine = transcriptLines.find(p => {
            return Math.abs(parseFloat(p.getAttribute('data-time')) - marker.timeInSeconds) <= 1;
        });

        var speechText = '';
        if (correspondingTranscriptLine && correspondingTranscriptLine.style.color === 'green') {
            speechText = correspondingTranscriptLine.getAttribute('data-saved').trim();
        }

        var fullDescription = marker.description + (marker.hasScreenshot ? ' - siehe Screenshot NR' + marker.screenshotTime : '');
        text += (index + 1) + '\t' + marker.timecode + '\t' + fullDescription + ' '.repeat(maxNoteLength - fullDescription.length + 2) + '\t' + marker.userName + '\t' + speechText + '\n';
    });

    text += '\n\n-------------- AUFLISTUNG SPRECHERTEXT -------------\n\n' + extractSpeakerLines() + '\n\n--------------------- GESAMT TRANSKRIPT ---------------------\n\n';

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

 

 