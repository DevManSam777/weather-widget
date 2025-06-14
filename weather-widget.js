class WeatherWidget extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
                this.timeInterval = null;
                this.currentCoords = null;
            }

            static get observedAttributes() {
                return ['location', 'units', 'theme'];
            }

            connectedCallback() {
                this.render();
                this.fetchWeather();
                this.startTimeUpdates();
            }

            disconnectedCallback() {
                if (this.timeInterval) {
                    clearInterval(this.timeInterval);
                }
            }

            attributeChangedCallback(name, oldValue, newValue) {
                if (oldValue !== newValue) {
                    if (name === 'theme') {
                        this.render();
                    }
                    this.fetchWeather();
                }
            }

            render() {
                const theme = this.getAttribute('theme');
                
                this.shadowRoot.innerHTML = `
                    <style>
                        .window {
                            width: 280px;
                            height: 200px;
                            position: relative;
                            border-radius: 12px;
                            overflow: hidden;
                            background: linear-gradient(135deg, #87CEEB, #98D8E8);
                            border: 8px solid #8B4513;
                            box-shadow: 
                                inset 0 0 20px rgba(255,255,255,0.3),
                                0 8px 32px rgba(0,0,0,0.3),
                                0 0 0 1px rgba(255,255,255,0.1);
                        }
                        
                        .glass-overlay {
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: linear-gradient(135deg, 
                                rgba(255,255,255,0.1) 0%,
                                transparent 50%,
                                rgba(255,255,255,0.05) 100%);
                            backdrop-filter: blur(1px);
                        }
                        
                        .window-frame {
                            position: absolute;
                            top: 50%;
                            left: 0;
                            right: 0;
                            height: 2px;
                            background: #654321;
                            z-index: 20;
                        }
                        
                        .window-frame::before {
                            content: '';
                            position: absolute;
                            top: -100px;
                            left: 50%;
                            width: 2px;
                            height: 202px;
                            background: #654321;
                            transform: translateX(-50%);
                        }
                        
                        .outside-view {
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            transition: all 1s ease;
                        }
                        
                        /* Day backgrounds */
                        .sunny {
                            background: linear-gradient(to bottom, #87CEEB 0%, #87CEEB 95%, #228B22 95%, #228B22 100%);
                        }
                        
                        .cloudy {
                            background: linear-gradient(to bottom, #B0C4DE 0%, #B0C4DE 95%, #228B22 95%, #228B22 100%);
                        }
                        
                        .rainy {
                            background: linear-gradient(to bottom, #4F4F4F 0%, #4F4F4F 95%, #228B22 95%, #228B22 100%);
                        }
                        
                        .snowy {
                            background: linear-gradient(to bottom, #A9A9A9 0%, #A9A9A9 95%, #FFFFFF 95%, #FFFFFF 100%);
                        }
                        
                        .stormy {
                            background: linear-gradient(to bottom, #2F2F2F 0%, #2F2F2F 95%, #228B22 95%, #228B22 100%);
                        }
                        
                        .partly-cloudy {
                            background: linear-gradient(to bottom, #87CEEB 0%, #87CEEB 95%, #228B22 95%, #228B22 100%);
                        }
                        
                        /* Night backgrounds */
                        .sunny.night {
                            background: linear-gradient(to bottom, #191970 0%, #191970 95%, #1F3F1F 95%, #1F3F1F 100%);
                        }
                        
                        .cloudy.night {
                            background: linear-gradient(to bottom, #2F2F4F 0%, #2F2F4F 95%, #1F3F1F 95%, #1F3F1F 100%);
                        }
                        
                        .rainy.night {
                            background: linear-gradient(to bottom, #1C1C1C 0%, #1C1C1C 95%, #1F3F1F 95%, #1F3F1F 100%);
                        }
                        
                        .snowy.night {
                            background: linear-gradient(to bottom, #4B4B6F 0%, #4B4B6F 95%, #F0F0F0 95%, #F0F0F0 100%);
                        }
                        
                        .stormy.night {
                            background: linear-gradient(to bottom, #000000 0%, #000000 95%, #1F3F1F 95%, #1F3F1F 100%);
                        }
                        
                        .partly-cloudy.night {
                            background: linear-gradient(to bottom, #2F2F5F 0%, #2F2F5F 95%, #1F3F1F 95%, #1F3F1F 100%);
                        }
                        
                        .weather-info {
                            position: absolute;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            padding: 16px;
                            color: white;
                            z-index: 15;
                            text-shadow: 2px 2px 6px rgba(0,0,0,0.9), 1px 1px 3px rgba(0,0,0,0.7);
                        }
                        
                        .location {
                            font-size: 16px;
                            opacity: 0.9;
                            margin-bottom: 6px;
                            font-family: -apple-system, system-ui, sans-serif;
                            font-weight: 600;
                        }
                        
                        .temp {
                            font-size: 38px;
                            font-weight: 300;
                            margin-bottom: 4px;
                            font-family: -apple-system, system-ui, sans-serif;
                        }
                        
                        .condition {
                            font-size: 15px;
                            opacity: 0.9;
                            font-family: -apple-system, system-ui, sans-serif;
                        }
                        
                        .local-time {
                            font-size: 16px;
                            opacity: 1;
                            font-family: -apple-system, system-ui, sans-serif;
                            margin-top: 4px;
                            font-weight: 500;
                        }
                        
                        .rain-drop {
                            position: absolute;
                            background: #00BFFF;
                            border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
                            animation: rain-fall linear infinite;
                            z-index: 10;
                            box-shadow: 0 0 3px rgba(0,191,255,0.8);
                        }
                        
                        @keyframes rain-fall {
                            from {
                                transform: translateY(-10px);
                                opacity: 1;
                            }
                            to {
                                transform: translateY(210px);
                                opacity: 0;
                            }
                        }
                        
                        .snow-flake {
                            position: absolute;
                            color: #FFFFFF;
                            font-size: 16px;
                            animation: snow-fall linear infinite;
                            z-index: 10;
                            user-select: none;
                            text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
                            filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.5));
                        }
                        
                        @keyframes snow-fall {
                            from {
                                transform: translateY(-10px) rotate(0deg);
                                opacity: 1;
                            }
                            to {
                                transform: translateY(210px) rotate(360deg);
                                opacity: 0;
                            }
                        }
                        
                        .sun {
                            position: absolute;
                            top: 20px;
                            right: 20px;
                            width: 40px;
                            height: 40px;
                            background: radial-gradient(circle, #FFD700, #FFA500);
                            border-radius: 50%;
                            box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
                            z-index: 5;
                        }
                        
                        .moon {
                            position: absolute;
                            top: 20px;
                            right: 20px;
                            width: 40px;
                            height: 40px;
                            background: radial-gradient(circle, #F5F5DC, #E6E6FA);
                            border-radius: 50%;
                            box-shadow: 0 0 15px rgba(245, 245, 220, 0.4);
                            z-index: 5;
                        }
                        
                        .moon::before {
                            content: '';
                            position: absolute;
                            top: 8px;
                            left: 8px;
                            width: 12px;
                            height: 12px;
                            background: rgba(100, 100, 100, 0.3);
                            border-radius: 50%;
                        }
                        
                        .moon::after {
                            content: '';
                            position: absolute;
                            top: 20px;
                            left: 15px;
                            width: 8px;
                            height: 8px;
                            background: rgba(100, 100, 100, 0.2);
                            border-radius: 50%;
                        }
                        
                        .cloud {
                            position: absolute;
                            background: rgba(255, 255, 255, 0.8);
                            border-radius: 50px;
                            z-index: 5;
                        }
                        
                        .cloud::before,
                        .cloud::after {
                            content: '';
                            position: absolute;
                            background: rgba(255, 255, 255, 0.8);
                            border-radius: 50px;
                        }
                        
                        .cloud-1 {
                            width: 60px;
                            height: 20px;
                            top: 30px;
                            left: 30px;
                            animation: float 6s ease-in-out infinite;
                        }
                        
                        .cloud-1::before {
                            width: 30px;
                            height: 30px;
                            top: -15px;
                            left: 10px;
                        }
                        
                        .cloud-1::after {
                            width: 40px;
                            height: 25px;
                            top: -10px;
                            right: 10px;
                        }
                        
                        .cloud-2 {
                            width: 50px;
                            height: 18px;
                            top: 50px;
                            right: 40px;
                            animation: float 8s ease-in-out infinite reverse;
                        }
                        
                        .cloud-2::before {
                            width: 25px;
                            height: 25px;
                            top: -12px;
                            left: 8px;
                        }
                        
                        .cloud-2::after {
                            width: 35px;
                            height: 20px;
                            top: -8px;
                            right: 8px;
                        }
                        
                        .cloud-3 {
                            width: 45px;
                            height: 15px;
                            top: 20px;
                            left: 60%;
                            animation: float 7s ease-in-out infinite;
                            animation-delay: -2s;
                        }
                        
                        .cloud-3::before {
                            width: 22px;
                            height: 22px;
                            top: -10px;
                            left: 7px;
                        }
                        
                        .cloud-3::after {
                            width: 30px;
                            height: 18px;
                            top: -7px;
                            right: 7px;
                        }
                        
                        @keyframes float {
                            0%, 100% { transform: translateX(0px); }
                            50% { transform: translateX(10px); }
                        }
                        
                        .lightning {
                            position: absolute;
                            top: 48px;
                            left: 40px;
                            color: #FFFF00;
                            font-size: 28px;
                            animation: lightning-flash 2s infinite;
                            z-index: 3;
                            text-shadow: 0 0 15px #FFFF00;
                        }
                        
                        @keyframes lightning-flash {
                            0%, 90%, 100% { opacity: 0; }
                            5%, 85% { opacity: 1; }
                        }
                        
                        .loading {
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            color: rgba(255,255,255,0.8);
                            font-size: 14px;
                        }
                    </style>
                    
                    <div class="window">
                        <div class="outside-view cloudy">
                            <div class="loading">Looking outside...</div>
                        </div>
                        <div class="glass-overlay"></div>
                        <div class="window-frame"></div>
                        <div class="weather-info">
                            <div class="location">${this.getDisplayName(this.getAttribute('location') || 'Unknown')}</div>
                            <div class="temp">--°</div>
                            <div class="condition">Loading...</div>
                            <div class="local-time">--:--</div>
                        </div>
                    </div>
                `;
            }

            async fetchWeather() {
                const location = this.getAttribute('location');
                const units = this.getAttribute('units') || 'F';
                
                if (!location) return;

                try {
                    const weatherData = await this.getWeatherData(location, units);
                    this.displayWeather(weatherData);
                } catch (error) {
                    console.error('Weather fetch error:', error);
                    this.displayError();
                }
            }

            async getWeatherData(location, units) {
                try {
                    // Get coordinates for the location
                    const coords = await this.geocodeLocation(location);
                    
                    // Store coordinates for timezone detection
                    this.currentCoords = coords;
                    
                    // Fetch weather from Open-Meteo (free, no API key needed)
                    const tempUnit = units === 'F' ? 'fahrenheit' : 'celsius';
                    const response = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&temperature_unit=${tempUnit}&windspeed_unit=mph&timezone=auto`
                    );
                    
                    if (!response.ok) {
                        throw new Error('Weather API error');
                    }
                    
                    const data = await response.json();
                    return this.mapOpenMeteoData(data, units);
                    
                } catch (error) {
                    throw new Error(`Failed to get weather data: ${error.message}`);
                }
            }

            async geocodeLocation(location) {
                try {
                    // Use OpenStreetMap Nominatim (free, no API key)
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`
                    );
                    
                    if (!response.ok) {
                        throw new Error('Geocoding failed');
                    }
                    
                    const data = await response.json();
                    
                    if (!data || data.length === 0) {
                        throw new Error('Location not found');
                    }
                    
                    return {
                        lat: parseFloat(data[0].lat),
                        lon: parseFloat(data[0].lon)
                    };
                    
                } catch (error) {
                    throw new Error(`Geocoding error: ${error.message}`);
                }
            }

            mapOpenMeteoData(data, units) {
                const current = data.current_weather;
                
                // Map weather codes to our conditions
                const weatherCode = current.weathercode;
                const condition = this.mapWeatherCode(weatherCode);
                
                return {
                    main: {
                        temp: current.temperature
                    },
                    condition: condition,
                    wind: {
                        speed: Math.round(current.windspeed)
                    },
                    humidity: 65 // Open-Meteo doesn't provide humidity in free tier
                };
            }

            mapWeatherCode(code) {
                // Open-Meteo weather codes: https://open-meteo.com/en/docs
                if (code === 0) return { name: 'Clear', dayClass: 'sunny', nightClass: 'sunny', dayEffects: 'sun', nightEffects: 'moon' };
                if (code >= 1 && code <= 3) return { name: 'Partly Cloudy', dayClass: 'partly-cloudy', nightClass: 'partly-cloudy', dayEffects: 'sun-clouds', nightEffects: 'moon-clouds' };
                if (code >= 45 && code <= 48) return { name: 'Cloudy', dayClass: 'cloudy', nightClass: 'cloudy', dayEffects: 'clouds', nightEffects: 'clouds' };
                if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { name: 'Rain', dayClass: 'rainy', nightClass: 'rainy', dayEffects: 'rain', nightEffects: 'rain' };
                if (code >= 71 && code <= 77) return { name: 'Snow Showers', dayClass: 'snowy', nightClass: 'snowy', dayEffects: 'snow', nightEffects: 'snow' };
                if (code >= 95 && code <= 99) return { name: 'Thunderstorm', dayClass: 'stormy', nightClass: 'stormy', dayEffects: 'lightning', nightEffects: 'lightning' };
                
                // Default to partly cloudy
                return { name: 'Partly Cloudy', dayClass: 'partly-cloudy', nightClass: 'partly-cloudy', dayEffects: 'sun-clouds', nightEffects: 'moon-clouds' };
            }

            displayWeather(data) {
                const units = this.getAttribute('units') || 'F';
                const tempUnit = units === 'F' ? '°F' : '°C';
                const location = this.getAttribute('location');
                
                // Check if it's nighttime
                const isNight = this.isNightTime(location);
                const weatherClass = isNight ? data.condition.nightClass : data.condition.dayClass;
                const effects = isNight ? data.condition.nightEffects : data.condition.dayEffects;
                
                // Update the outside view with day/night class
                const outsideView = this.shadowRoot.querySelector('.outside-view');
                outsideView.className = `outside-view ${weatherClass}${isNight ? ' night' : ''}`;
                
                // Add local time
                const localTime = this.getLocalTime(location);
                const displayName = isNight ? 
                    (data.condition.name === 'Clear' ? 'Clear Night' : data.condition.name) :
                    (data.condition.name === 'Clear' ? 'Sunny' : data.condition.name);
                
                this.shadowRoot.querySelector('.weather-info').innerHTML = `
                    <div class="location">${this.getDisplayName(location)}</div>
                    <div class="temp">${Math.round(data.main.temp)}${tempUnit}</div>
                    <div class="condition">${displayName}</div>
                    <div class="local-time">${localTime}</div>
                `;
                
                this.addWeatherEffects(effects, isNight);
            }

            isNightTime(location) {
                const timeZone = this.getTimeZone(location);
                const now = new Date();
                
                try {
                    const localTime = new Date(now.toLocaleString("en-US", {timeZone: timeZone}));
                    const hour = localTime.getHours();
                    // Night time is from 7 PM to 6 AM
                    return hour >= 19 || hour < 6;
                } catch (error) {
                    const hour = now.getHours();
                    return hour >= 19 || hour < 6;
                }
            }

            getLocalTime(location) {
                const now = new Date();
                const timeZone = this.getTimeZone(location);
                
                // Debug logging
                console.log(`Location: ${location}, Timezone: ${timeZone}`);
                
                try {
                    const localTime = now.toLocaleTimeString('en-US', {
                        timeZone: timeZone,
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });
                    console.log(`Local time result: ${localTime}`);
                    return localTime;
                } catch (error) {
                    console.error('Timezone error:', error, 'Timezone:', timeZone);
                    
                    // Manual Pacific Time calculation as fallback
                    if (timeZone === 'America/Los_Angeles') {
                        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
                        const pacificOffset = -8; // PST is UTC-8, PDT is UTC-7
                        const pacificTime = new Date(utc + (pacificOffset * 3600000));
                        return pacificTime.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        });
                    }
                    
                    return now.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });
                }
            }

            getDisplayName(location) {
                // Extract city name for display
                if (location.includes(',')) {
                    return location.split(',')[0].trim();
                }
                // Handle ZIP codes - show city name
                if (/^\d{5}$/.test(location)) {
                    const zipMappings = {
                        '10001': 'New York',
                        '90210': 'Beverly Hills', 
                        '60601': 'Chicago',
                        '33101': 'Miami',
                        '75001': 'Dallas',
                        '94513': 'Brentwood'
                    };
                    return zipMappings[location] || location;
                }
                return location;
            }

            getTimeZone(location) {
                // Debug what we're getting
                console.log('Getting timezone for location:', location);
                
                // Direct location mapping - much more reliable
                const locationMappings = {
                    // City, Country format
                    'Tokyo, Japan': 'Asia/Tokyo',
                    'London, UK': 'Europe/London',
                    'Paris, France': 'Europe/Paris',
                    'Sydney, Australia': 'Australia/Sydney',
                    'Berlin, Germany': 'Europe/Berlin',
                    'Mumbai, India': 'Asia/Kolkata',
                    'Moscow, Russia': 'Europe/Moscow',
                    'Dubai, UAE': 'Asia/Dubai',
                    
                    // City, State, Country format  
                    'New York, NY, USA': 'America/New_York',
                    'Los Angeles, CA, USA': 'America/Los_Angeles',
                    'Chicago, IL, USA': 'America/Chicago',
                    'Miami, FL, USA': 'America/New_York',
                    'Seattle, WA, USA': 'America/Los_Angeles',
                    'Paris, TX, USA': 'America/Chicago',
                    'London, ON, Canada': 'America/Toronto',
                    'Brentwood, CA, USA': 'America/Los_Angeles',  // Add this specifically
                    
                    // California ZIP codes - ALL Pacific Time
                    '94513': 'America/Los_Angeles',  // Brentwood, CA
                    '90210': 'America/Los_Angeles',  // Beverly Hills, CA
                    '94102': 'America/Los_Angeles',  // San Francisco, CA
                    '91210': 'America/Los_Angeles',  // Glendale, CA
                    '92101': 'America/Los_Angeles',  // San Diego, CA
                    '95101': 'America/Los_Angeles',  // San Jose, CA
                    
                    // Other major ZIP codes
                    '10001': 'America/New_York',     // NYC
                    '60601': 'America/Chicago',      // Chicago
                    '33101': 'America/New_York',     // Miami
                    '75001': 'America/Chicago',      // Dallas area
                    '80201': 'America/Denver',       // Denver
                    '85001': 'America/Phoenix',      // Phoenix
                    
                    // Legacy single names for backward compatibility
                    'New York': 'America/New_York',
                    'London': 'Europe/London', 
                    'Tokyo': 'Asia/Tokyo',
                    'Sydney': 'Australia/Sydney',
                    'Paris': 'Europe/Paris',
                    'Miami': 'America/New_York',
                    'Berlin': 'Europe/Berlin',
                    'Los Angeles': 'America/Los_Angeles',
                    'Mumbai': 'Asia/Kolkata'
                };
                
                // Check direct mapping first
                if (locationMappings[location]) {
                    const timezone = locationMappings[location];
                    console.log('Found timezone:', timezone);
                    return timezone;
                }
                
                // If coordinates available, use them as fallback
                if (this.currentCoords) {
                    const coordTimezone = this.getTimeZoneByCoordinates(this.currentCoords.lat, this.currentCoords.lon);
                    console.log('Using coordinate timezone:', coordTimezone);
                    return coordTimezone;
                }
                
                console.log('Defaulting to UTC');
                return 'UTC';
            }

            getTimeZoneByCoordinates(lat, lon) {
                // US timezone detection based on coordinates
                if (lat >= 24.0 && lat <= 71.0 && lon >= -180.0 && lon <= -129.0) return 'America/Anchorage'; // Alaska/Hawaii
                if (lat >= 32.0 && lat <= 49.0 && lon >= -125.0 && lon <= -114.0) return 'America/Los_Angeles'; // Pacific
                if (lat >= 31.0 && lat <= 49.0 && lon >= -114.0 && lon <= -104.0) return 'America/Denver'; // Mountain  
                if (lat >= 25.0 && lat <= 49.0 && lon >= -104.0 && lon <= -87.0) return 'America/Chicago'; // Central
                if (lat >= 24.0 && lat <= 49.0 && lon >= -87.0 && lon <= -67.0) return 'America/New_York'; // Eastern
                
                // International rough detection
                if (lat >= 35.0 && lat <= 71.0 && lon >= -10.0 && lon <= 40.0) return 'Europe/London'; // Europe
                if (lat >= 20.0 && lat <= 50.0 && lon >= 100.0 && lon <= 145.0) return 'Asia/Tokyo'; // East Asia
                if (lat >= -45.0 && lat <= -10.0 && lon >= 110.0 && lon <= 155.0) return 'Australia/Sydney'; // Australia
                if (lat >= 6.0 && lat <= 37.0 && lon >= 68.0 && lon <= 97.0) return 'Asia/Kolkata'; // India
                
                return 'UTC'; // Fallback
            }

            getDisplayName(location) {
                // Extract city name for display
                if (location.includes(',')) {
                    return location.split(',')[0].trim();
                }
                // Handle ZIP codes
                if (/^\d{5}$/.test(location)) {
                    const zipMappings = {
                        '10001': 'New York',
                        '90210': 'Beverly Hills', 
                        '60601': 'Chicago',
                        '33101': 'Miami',
                        '75001': 'Dallas',
                        '94513': 'Brentwood'
                    };
                    return zipMappings[location] || location;
                }
                return location;
            }

            addWeatherEffects(effects, isNight = false) {
                const outsideView = this.shadowRoot.querySelector('.outside-view');
                
                switch(effects) {
                    case 'sun':
                        outsideView.innerHTML = '<div class="sun"></div>';
                        break;
                    case 'moon':
                        outsideView.innerHTML = '<div class="moon"></div>';
                        break;
                    case 'clouds':
                        outsideView.innerHTML = '<div class="cloud cloud-1"></div><div class="cloud cloud-2"></div><div class="cloud cloud-3"></div>';
                        break;
                    case 'sun-clouds':
                        outsideView.innerHTML = '<div class="sun"></div><div class="cloud cloud-1"></div><div class="cloud cloud-2"></div>';
                        break;
                    case 'moon-clouds':
                        outsideView.innerHTML = '<div class="moon"></div><div class="cloud cloud-1"></div><div class="cloud cloud-2"></div>';
                        break;
                    case 'rain':
                        outsideView.innerHTML = '';
                        this.createRain();
                        break;
                    case 'snow':
                        outsideView.innerHTML = '';
                        this.createSnow();
                        break;
                    case 'lightning':
                        outsideView.innerHTML = '<div class="cloud cloud-1"></div><div class="cloud cloud-2"></div><div class="lightning">⚡</div>';
                        this.createRain();
                        break;
                }
            }

            createRain() {
                const outsideView = this.shadowRoot.querySelector('.outside-view');
                for (let i = 0; i < 20; i++) {
                    const drop = document.createElement('div');
                    drop.className = 'rain-drop';
                    drop.style.left = Math.random() * 100 + '%';
                    drop.style.width = '4px';
                    drop.style.height = '12px';
                    drop.style.animationDuration = (Math.random() * 0.3 + 0.4) + 's';
                    drop.style.animationDelay = Math.random() * 1.5 + 's';
                    outsideView.appendChild(drop);
                }
            }

            createSnow() {
                const outsideView = this.shadowRoot.querySelector('.outside-view');
                for (let i = 0; i < 25; i++) {
                    const flake = document.createElement('div');
                    flake.className = 'snow-flake';
                    flake.textContent = '❄';
                    flake.style.left = Math.random() * 100 + '%';
                    flake.style.animationDuration = (Math.random() * 2 + 2) + 's';
                    flake.style.animationDelay = Math.random() * 1.5 + 's';
                    outsideView.appendChild(flake);
                }
            }

            displayError() {
                const outsideView = this.shadowRoot.querySelector('.outside-view');
                outsideView.innerHTML = '<div class="loading">Connection failed...</div>';
                
                this.shadowRoot.querySelector('.weather-info').innerHTML = `
                    <div class="location">${this.getDisplayName(this.getAttribute('location'))}</div>
                    <div class="temp">--°</div>
                    <div class="condition">Connection lost</div>
                    <div class="local-time">--:--</div>
                `;
            }

            startTimeUpdates() {
                // Update time every minute and check for day/night changes
                this.timeInterval = setInterval(() => {
                    const timeElement = this.shadowRoot.querySelector('.local-time');
                    if (timeElement && timeElement.textContent !== '--:--') {
                        const location = this.getAttribute('location');
                        timeElement.textContent = this.getLocalTime(location);
                        
                        // Check if day/night status has changed
                        const currentIsNight = this.isNightTime(location);
                        const outsideView = this.shadowRoot.querySelector('.outside-view');
                        const wasNight = outsideView.classList.contains('night');
                        
                        if (currentIsNight !== wasNight) {
                            // Day/night changed, refresh the weather display
                            this.fetchWeather();
                        }
                    }
                }, 60000);
            }
        }

        customElements.define('weather-widget', WeatherWidget);