const audio = document.getElementById('audioPlayer');
const playButton = document.getElementById('playButton');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const timeDisplay = document.getElementById('timeDisplay');
const status = document.getElementById('status');
const streamUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';

let hls;
let isPlaying = false;
let startTime = null;
let elapsedSeconds = 0;
let timerInterval = null;

// Initialize volume
audio.volume = 0.7;

// Initialize HLS
function initPlayer() {
    if (Hls.isSupported()) {
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(audio);

        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            console.log('Stream manifest loaded');
            updateStatus('Ready to play', 'ready');
        });

        hls.on(Hls.Events.ERROR, function(event, data) {
            console.error('HLS Error:', data);
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        updateStatus('Network error - trying to recover...', 'error');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        updateStatus('Media error - trying to recover...', 'error');
                        hls.recoverMediaError();
                        break;
                    default:
                        updateStatus('Fatal error - cannot recover', 'error');
                        hls.destroy();
                        break;
                }
            }
        });

    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        audio.src = streamUrl;
        updateStatus('Ready to play', 'ready');
    } else {
        updateStatus('HLS is not supported in this browser', 'error');
        playButton.disabled = true;
    }
}

// Format time as M:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update elapsed time display
function updateTimeDisplay() {
    if (isPlaying) {
        elapsedSeconds++;
        timeDisplay.textContent = `${formatTime(elapsedSeconds)} / Live`;
    }
}

// Start timer
function startTimer() {
    if (!timerInterval) {
        timerInterval = setInterval(updateTimeDisplay, 1000);
    }
}

// Stop timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Reset timer
function resetTimer() {
    stopTimer();
    elapsedSeconds = 0;
    timeDisplay.textContent = '0:00 / Live';
}

// Play/Pause toggle
playButton.addEventListener('click', function() {
    if (!isPlaying) {
        audio.play()
            .then(() => {
                isPlaying = true;
                playButton.textContent = '⏸';
                updateStatus('Playing live stream...', 'playing');
                startTimer();
            })
            .catch((error) => {
                console.error('Playback error:', error);
                updateStatus('Playback failed: ' + error.message, 'error');
            });
    } else {
        audio.pause();
        isPlaying = false;
        playButton.textContent = '▶';
        updateStatus('Paused', 'ready');
        stopTimer();
    }
});

// Volume control
volumeSlider.addEventListener('input', function() {
    const volume = this.value / 100;
    audio.volume = volume;
    volumeValue.textContent = this.value + '%';

    // Update volume icon based on level
    const volumeIcon = document.querySelector('.volume-icon');
    if (volume === 0) {
        volumeIcon.textContent = '🔇';
    } else if (volume < 0.5) {
        volumeIcon.textContent = '🔉';
    } else {
        volumeIcon.textContent = '🔊';
    }
});

// Audio events
audio.addEventListener('waiting', function() {
    updateStatus('Buffering...', 'ready');
    stopTimer();
});

audio.addEventListener('playing', function() {
    updateStatus('Playing live stream...', 'playing');
    startTimer();
});

audio.addEventListener('pause', function() {
    if (isPlaying) {
        updateStatus('Paused', 'ready');
    }
    stopTimer();
});

audio.addEventListener('ended', function() {
    isPlaying = false;
    playButton.textContent = '▶';
    updateStatus('Stream ended', 'ready');
    stopTimer();
});

// Update status message
function updateStatus(message, type) {
    status.textContent = message;
    status.className = 'status';
    if (type === 'playing') {
        status.classList.add('playing');
    } else if (type === 'error') {
        status.classList.add('error');
    }
}

let currentSongId = null;
let hasRatedCurrentSong = false;
let currentRating = null;

// Fetch and update metadata
const metadataUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';

async function fetchMetadata() {
    try {
        const response = await fetch(metadataUrl);
        const data = await response.json();
        updateNowPlaying(data);

        // Parse previous tracks from flat structure
        const recentTracks = [];
        for (let i = 1; i <= 5; i++) {
            const artist = data[`prev_artist_${i}`];
            const title = data[`prev_title_${i}`];
            if (artist || title) {
                recentTracks.push({
                    artist: artist || 'Unknown Artist',
                    song: title || 'Unknown Track'
                });
            }
        }
        updateRecentlyPlayed(recentTracks);
    } catch (error) {
        console.error('Error fetching metadata:', error);
    }
}

function updateNowPlaying(data) {
    const songEl = document.getElementById('currentSong');
    const artistEl = document.getElementById('currentArtist');
    const albumEl = document.getElementById('currentAlbum');
    const albumArtEl = document.getElementById('albumArt');
    const yearBadgeEl = document.getElementById('yearBadge');

    const title = data.title || data.song || 'Unknown Track';
    const artist = data.artist || 'Unknown Artist';

    songEl.textContent = title;
    artistEl.textContent = artist;

    if (data.album && data.date) {
        albumEl.textContent = `${data.album} (${data.date})`;
        // Extract year from date and update badge
        const year = data.date.match(/\d{4}/);
        if (year) {
            yearBadgeEl.textContent = year[0];
        }
    } else if (data.album) {
        albumEl.textContent = data.album;
    } else {
        albumEl.textContent = '';
    }

    // Update album art with cache busting to ensure fresh image
    albumArtEl.src = `https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg?t=${Date.now()}`;

    // Create unique song ID from artist and title
    const newSongId = `${artist}||${title}`.toLowerCase().replace(/[^a-z0-9||]/g, '');

    // Check if song has changed
    if (newSongId !== currentSongId) {
        currentSongId = newSongId;
        hasRatedCurrentSong = false;
        document.getElementById('ratingMessage').textContent = '';
        fetchRatings(currentSongId);
    }
}

function updateRecentlyPlayed(tracks) {
    const container = document.getElementById('recentTracks');

    console.log('Updating recent tracks, count:', tracks ? tracks.length : 0);

    if (!tracks || tracks.length === 0) {
        container.innerHTML = '<div class="track-item">No recent tracks available</div>';
        return;
    }

    container.innerHTML = '';
    tracks.forEach((track, index) => {
        const trackEl = document.createElement('div');
        trackEl.className = 'track-item';

        const artist = track.artist || 'Unknown Artist';
        const song = track.song || 'Unknown Track';

        trackEl.innerHTML = `<span class="track-artist">${artist}</span>: <span class="track-song">${song}</span>`;
        container.appendChild(trackEl);
    });

    console.log('Displayed', tracks.length, 'recent tracks');
}

// Fetch ratings for a song
async function fetchRatings(songId) {
    try {
        // Fetch rating counts
        const response = await fetch(`/api/ratings/${encodeURIComponent(songId)}`);
        const data = await response.json();

        document.getElementById('thumbsUpCount').textContent = data.thumbsUp;
        document.getElementById('thumbsDownCount').textContent = data.thumbsDown;

        // Check if user has already rated this song
        const checkResponse = await fetch(`/api/ratings/${encodeURIComponent(songId)}/check`);
        const checkData = await checkResponse.json();

        // Reset button states
        document.getElementById('thumbsUpBtn').classList.remove('voted');
        document.getElementById('thumbsDownBtn').classList.remove('voted');

        if (checkData.hasRated) {
            hasRatedCurrentSong = true;
            currentRating = checkData.rating;

            // Highlight the button they voted for
            if (checkData.rating === 1) {
                document.getElementById('thumbsUpBtn').classList.add('voted');
            } else {
                document.getElementById('thumbsDownBtn').classList.add('voted');
            }
            document.getElementById('ratingMessage').textContent = 'You rated this song';
        } else {
            hasRatedCurrentSong = false;
            currentRating = null;
        }
    } catch (error) {
        console.error('Error fetching ratings:', error);
    }
}

// Submit a rating
async function submitRating(rating) {
    if (!currentSongId) {
        return;
    }

    if (hasRatedCurrentSong) {
        document.getElementById('ratingMessage').textContent = 'You have already rated this song';
        return;
    }

    try {
        const response = await fetch('/api/ratings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                songId: currentSongId,
                rating: rating
            })
        });

        const data = await response.json();

        if (response.ok) {
            hasRatedCurrentSong = true;
            currentRating = rating;
            document.getElementById('thumbsUpCount').textContent = data.thumbsUp;
            document.getElementById('thumbsDownCount').textContent = data.thumbsDown;

            // Mark the button as voted
            if (rating === 1) {
                document.getElementById('thumbsUpBtn').classList.add('voted');
            } else {
                document.getElementById('thumbsDownBtn').classList.add('voted');
            }

            document.getElementById('ratingMessage').textContent = 'Thanks for rating!';
        } else if (response.status === 409) {
            hasRatedCurrentSong = true;
            document.getElementById('ratingMessage').textContent = data.error;
        } else {
            document.getElementById('ratingMessage').textContent = 'Error submitting rating';
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        document.getElementById('ratingMessage').textContent = 'Error submitting rating';
    }
}

// Rating button event listeners
document.getElementById('thumbsUpBtn').addEventListener('click', function() {
    submitRating(1);
});

document.getElementById('thumbsDownBtn').addEventListener('click', function() {
    submitRating(-1);
});

// Initialize player on page load
initPlayer();

// Fetch metadata immediately and then every 10 seconds
fetchMetadata();
setInterval(fetchMetadata, 10000);
