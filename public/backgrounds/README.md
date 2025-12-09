# Background Images

Place your background images here.

## Requirements

- **Format**: JPG or PNG
- **Size**: 1920x1080px minimum
- **Quality**: Optimized for web (< 500KB)
- **Style**: Consistent with game theme

## Files Needed

```
home-bg.jpg          # Home page background
game-bg.jpg          # Match-3 game background
card-game-bg.jpg     # Card game background
admin-bg.jpg         # Admin panel background
```

## Design Guidelines

- Use gradient overlays for better text readability
- Avoid busy patterns that distract from UI
- Consider dark themes for better contrast
- Optimize images using tools like TinyPNG

## CSS Usage

Backgrounds are set in component styles or globals.css:

```css
background-image: url('/backgrounds/home-bg.jpg');
background-size: cover;
background-position: center;
```

## Performance

- Use WebP format for better compression
- Implement lazy loading for non-critical backgrounds
- Consider using CSS gradients instead of images when possible
