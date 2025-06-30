# Chaotic Ball Animation

A mesmerizing web app featuring two chaotic balls bouncing through concentric rings with MIDI integration and infinite zoom effect.

## Features

- **Chaotic Physics**: Two balls with realistic elastic collisions
- **Concentric Rings**: Customizable number of rings with gaps at 3 o'clock position
- **MIDI Integration**: Import MIDI files to play notes when rings are destroyed
- **Infinite Zoom Effect**: Smooth zooming to maintain visual consistency
- **Question & Answer System**: Customizable labels and scoring for each ball
- **Real-time HUD**: Timer, FPS counter, and live scoreboard
- **Responsive Design**: Works on desktop and mobile devices

## How to Use

1. Open `index.html` in a web browser
2. Click the gear icon (⚙️) to open settings
3. Customize your question and answer labels
4. Adjust ring count, gap size, and ball speed
5. Upload a MIDI file for audio feedback
6. Click "Apply & Restart" to begin the simulation

## Controls

- **Space Bar**: Pause/Resume animation
- **⚙️ Button**: Toggle settings panel
- **MIDI File**: Upload .mid or .midi files for audio

## Physics Simulation

- Balls spawn inside the innermost ring
- They bounce off ring walls and each other
- When a ball exits through a ring's gap, that ring disappears
- Each ring destruction increments the ball's score and plays a MIDI note
- The view automatically zooms to keep all active rings visible

## Deployment

This is a static web app that can be deployed to any web hosting service:

- GitHub Pages
- Netlify
- Vercel
- Any static hosting provider

Simply upload the files and access `index.html`.

## Browser Compatibility

- Modern browsers with Canvas and Web Audio API support
- Chrome, Firefox, Safari, Edge (recent versions)
- Mobile browsers supported

## Technical Details

- Pure vanilla JavaScript (no frameworks)
- HTML5 Canvas for rendering
- Web Audio API for MIDI playback
- Responsive CSS design
- Real-time physics simulation at 60 FPS