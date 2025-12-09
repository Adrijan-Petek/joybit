# Audio Assets

Place your audio files here.

## Structure

```
audio/
├── music/
│   ├── main-menu.mp3
│   ├── game-theme.mp3
│   └── card-theme.mp3
└── sfx/
    ├── pop.mp3
    ├── swap.mp3
    ├── win.mp3
    ├── lose.mp3
    ├── game-over.mp3
    ├── card-flip.mp3
    ├── card-click.mp3
    ├── reward.mp3
    └── click.mp3
```

## Requirements

### Music Files
- **Format**: MP3 or OGG
- **Length**: 1-3 minutes (loopable)
- **Quality**: 128-192 kbps
- **Volume**: Normalized to -14 LUFS

### Sound Effects
- **Format**: MP3 or OGG
- **Length**: 0.1-2 seconds
- **Quality**: 96-128 kbps
- **Volume**: Normalized, no clipping

## Audio Management

Audio is managed through the `AudioContext` component:
- Global volume control
- Mute/unmute toggle
- Automatic music looping
- Sound effect pooling

## Tips

- Keep file sizes small for web performance
- Test on different devices
- Ensure sounds are not annoying on repetition
- Consider royalty-free music sources
