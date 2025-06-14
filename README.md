# Weather Widget

A simple weather widget that shows current conditions in a window-style display with animated effects.

## How to Use

Include the JavaScript file and add the HTML tag:

```html
<script src="weather-widget.js"></script>
<weather-widget location="New York"></weather-widget>
```

## Options

```html
<!-- City names -->
<weather-widget location="New York"></weather-widget>
<weather-widget location="London, UK"></weather-widget>

<!-- ZIP codes -->
<weather-widget location="10001"></weather-widget>
<weather-widget location="90210"></weather-widget>

<!-- Coordinates -->
<weather-widget location="40.7128,-74.0060"></weather-widget>

<!-- Airport codes -->
<weather-widget location="LAX"></weather-widget>

<!-- With Celsius -->
<weather-widget location="London" units="C"></weather-widget>
```

## What It Does

- Shows current temperature, weather condition, and local time
- Updates weather data every 15 minutes automatically  
- Changes between day/night themes based on actual sunrise/sunset times
- Animated effects for different weather (rain, snow, clouds, etc.)

## Browser Requirements

Works in modern browsers that support Web Components (Chrome, Firefox, Safari, Edge).

## Size

The widget is 280px wide by 200px tall. You can scale it with CSS:

```css
weather-widget {
  transform: scale(1.5);
}
```
