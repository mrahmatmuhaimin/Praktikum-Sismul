function resizeImage() {
    var fileInput = document.getElementById('imageInput');
    var file = fileInput.files[0];

    if (file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                var originalWidth = img.naturalWidth;
                var originalHeight = img.naturalHeight;

                var newWidthInput = document.getElementById('newWidthInput');
                var newHeightInput = document.getElementById('newHeightInput');
                var brightnessInput = document.getElementById('brightnessInput');
                var saturationInput = document.getElementById('saturationInput');

                var newWidth = parseInt(newWidthInput.value);
                var newHeight = parseInt(newHeightInput.value);
                var brightness = parseInt(brightnessInput.value);
                var saturation = parseInt(saturationInput.value);

                if (isNaN(newWidth) || isNaN(newHeight) || newWidth <= 0 || newHeight <= 0) {
                    alert('Please enter valid dimensions');
                    return;
                }

                var rotateInput = document.getElementById('rotateInput');
                var flipInput = document.getElementById('flipInput');

                var rotateAngle = parseInt(rotateInput.value) || 0;
                var flipHorizontal = flipInput.checked;

                var scaleX = newWidth / originalWidth;
                var scaleY = newHeight / originalHeight;

                var scaledWidth = originalWidth * scaleX;
                var scaledHeight = originalHeight * scaleY;

                var canvas = document.createElement('canvas');
                canvas.width = scaledWidth;
                canvas.height = scaledHeight;

                var ctx = canvas.getContext('2d');

                if (rotateAngle !== 0 || flipHorizontal) {
                    ctx.save();
                    ctx.translate(scaledWidth / 2, scaledHeight / 2);
                    ctx.rotate((rotateAngle * Math.PI) / 180);
                    if (flipHorizontal) ctx.scale(-1, 1);
                    ctx.drawImage(img, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
                }

                // Mengatur tingkat kecerahan (brightness)
                if (!isNaN(brightness)) {
                    var imageData = ctx.getImageData(0, 0, newWidth, newHeight);
                    var data = imageData.data;
                    var adjustedBrightness = brightness / 100;

                    for (var i = 0; i < data.length; i += 4) {
                        data[i] += 255 * adjustedBrightness;
                        data[i + 1] += 255 * adjustedBrightness;
                        data[i + 2] += 255 * adjustedBrightness;
                    }

                    ctx.putImageData(imageData, 0, 0);
                }

                // Mengatur tingkat saturasi (saturation)
                if (!isNaN(saturation)) {
                    var imageData = ctx.getImageData(0, 0, newWidth, newHeight);
                    var data = imageData.data;
                    var adjustedSaturation = saturation / 100;

                    for (var i = 0; i < data.length; i += 4) {
                        var r = data[i];
                        var g = data[i + 1];
                        var b = data[i + 2];

                        var gray = 0.2989 * r + 0.587 * g + 0.114 * b;

                        data[i] = gray + adjustedSaturation * (r - gray);
                        data[i + 1] = gray + adjustedSaturation * (g - gray);
                        data[i + 2] = gray + adjustedSaturation * (b - gray);
                    }

                    ctx.putImageData(imageData, 0, 0);
                }


                // Dapatkan URL gambar hasil resize
                var resizedImageURL = canvas.toDataURL('image/jpeg');

                // Tampilkan gambar hasil resize
                var previewImage = document.getElementById('previewImage');
                previewImage.src = resizedImageURL;
                previewImage.style.display = 'block';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function compressAudio() {
    var fileInput = document.getElementById('audioInput');
    var file = fileInput.files[0];
  
    if (file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var audio = new Audio();
        audio.onloadedmetadata = function() {
          var bitRateInput = document.getElementById('bitRateInput');
          var sampleRateInput = document.getElementById('sampleRateInput');
          var speedInput = document.getElementById('speedInput');
  
          var bitRate = parseInt(bitRateInput.value);
          var sampleRate = parseInt(sampleRateInput.value);
          var speed = parseFloat(speedInput.value);
  
          if (isNaN(bitRate) || isNaN(sampleRate) || isNaN(speed) || bitRate <= 0 || sampleRate <= 0 || speed <= 0) {
            alert('Please enter valid bit rate, sample rate, and speed');
            return;
          }
  
          var originalBitRate = audio.bitrate;
          var originalSampleRate = audio.sampleRate;
  
          var compressedAudio = audio;
          if (bitRate < originalBitRate) {
            compressedAudio = compressBitRate(audio, bitRate);
          }
  
          if (sampleRate < originalSampleRate) {
            compressedAudio = compressSampleRate(compressedAudio, sampleRate);
          }
  
          // Set the playback speed of compressed audio
          compressedAudio.playbackRate = speed;
  
          // Play the compressed audio
          compressedAudio.play();
        };
        audio.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }


function compressBitRate(audio, bitRate) {
    var mediaSource = new MediaSource();
    var sourceBuffer;
    var compressedAudio = new Audio();

    mediaSource.addEventListener('sourceopen', function () {
        sourceBuffer = mediaSource.addSourceBuffer(audio.type);
        sourceBuffer.addEventListener('updateend', function () {
            mediaSource.endOfStream();
            compressedAudio.src = URL.createObjectURL(mediaSource);
        });

        var reader = new FileReader();
        reader.onload = function (e) {
            sourceBuffer.appendBuffer(e.target.result);
        };

        var byteArray = base64ToArrayBuffer(audio.src.split(',')[1]);
        var buffer = arrayBufferToAudioBuffer(byteArray);

        var targetBitRate = Math.round(bitRate * 1000);
        var targetLength = buffer.duration * targetBitRate;

        var offlineContext = new OfflineAudioContext(buffer.numberOfChannels, targetLength, targetBitRate);

        var source = offlineContext.createBufferSource();
        source.buffer = buffer;

        source.connect(offlineContext.destination);
        offlineContext.startRendering();

        offlineContext.oncomplete = function (event) {
            var compressedBuffer = event.renderedBuffer;
            var compressedData = audioBufferToArrayBuffer(compressedBuffer);

            reader.readAsArrayBuffer(compressedData);
        };
    });

    return compressedAudio;
}

function compressSampleRate(audio, sampleRate) {
    var originalSampleRate = audio.sampleRate;
    var compressionRatio = originalSampleRate / sampleRate;

    var offlineContext = new OfflineAudioContext(audio.numberOfChannels, audio.duration * compressionRatio, sampleRate);

    var source = offlineContext.createBufferSource();
    source.buffer = audio;

    source.connect(offlineContext.destination);
    offlineContext.startRendering();

    offlineContext.oncomplete = function (event) {
        var compressedBuffer = event.renderedBuffer;

        // Create a new AudioBuffer with the compressed sample rate
        var compressedAudioBuffer = new AudioContext().createBuffer(
            compressedBuffer.numberOfChannels,
            compressedBuffer.length,
            sampleRate
        );

        // Copy the data from the compressed buffer to the new audio buffer
        for (var channel = 0; channel < compressedBuffer.numberOfChannels; channel++) {
            var channelData = compressedBuffer.getChannelData(channel);
            compressedAudioBuffer.copyToChannel(channelData, channel);
        }

        // Create a new Audio object with the compressed audio buffer
        var compressedAudio = new Audio();
        compressedAudio.src = URL.createObjectURL(compressedAudioBuffer);

        return compressedAudio;
    }

    function base64ToArrayBuffer(base64) {
        var binaryString = window.atob(base64);
        var len = binaryString.length;
        var bytes = new Uint8Array(len);

        for (var i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes.buffer;
    }

    function arrayBufferToAudioBuffer(buffer) {
        var audioContext = new AudioContext();

        return new Promise(function (resolve, reject) {
            audioContext.decodeAudioData(buffer, resolve, reject);
        });
    }

    function audioBufferToArrayBuffer(buffer) {
        var numberOfChannels = buffer.numberOfChannels;
        var channelData = new Float32Array(buffer.length * numberOfChannels);
        var offset = 0;

        for (var channel = 0; channel < numberOfChannels; channel++) {
            channelData.set(buffer.getChannelData(channel), offset);
            offset += buffer.length;
        }

        return channelData.buffer;
    }
}  