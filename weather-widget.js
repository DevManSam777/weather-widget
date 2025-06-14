class WeatherWidget extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
                this.timeInterval = null;
                this.currentTimezone = null;
                this.currentLocationName = null;
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
                const location = this.getAttribute('location') || 'Unknown';
                
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
                            text-align: center;
                            padding: 10px;
                        }
                    </style>
                    
                    <div class="window">
                        <div class="outside-view cloudy">
                            <div class="loading">Looking outside...</div>
                        </div>
                        <div class="glass-overlay"></div>
                        <div class="window-frame"></div>
                        <div class="weather-info">
                            <div class="location">${this.getDisplayName(location)}</div>
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

                console.log('Initializing widget for location:', location);

                try {
                    const weatherData = await this.getWeatherData(location, units);
                    this.displayWeather(weatherData);
                } catch (error) {
                    console.error('Weather fetch error:', error);
                    
                    // Try again after a short delay
                    setTimeout(async () => {
                        try {
                            console.log('Retrying weather fetch for:', location);
                            const weatherData = await this.getWeatherData(location, units);
                            this.displayWeather(weatherData);
                        } catch (retryError) {
                            console.error('Retry failed:', retryError);
                            this.displayError(retryError.message);
                        }
                    }, 2000);
                    
                    this.displayError(error.message);
                }
            }

            async getWeatherData(location, units) {
                try {
                    // Get coordinates for the location
                    const geocodeData = await this.geocodeLocation(location);
                    console.log('Got coordinates:', geocodeData);
                    
                    // Fetch weather from Open-Meteo (includes timezone info)
                    const tempUnit = units === 'F' ? 'fahrenheit' : 'celsius';
                    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geocodeData.coords.lat}&longitude=${geocodeData.coords.lon}&current_weather=true&temperature_unit=${tempUnit}&windspeed_unit=mph&timezone=auto`;
                    console.log('Fetching weather from:', weatherUrl);
                    
                    const response = await fetch(weatherUrl);
                    
                    if (!response.ok) {
                        console.error('Weather API response not ok:', response.status, response.statusText);
                        throw new Error(`Weather API error: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log('Weather data received:', data);
                    
                    // Store timezone and location info for time display
                    this.currentTimezone = data.timezone;
                    this.currentLocationName = geocodeData.displayName;
                    
                    return this.mapOpenMeteoData(data, units);
                    
                } catch (error) {
                    console.error('Weather fetch error details:', error);
                    throw new Error(`Failed to get weather data: ${error.message}`);
                }
            }

            async geocodeLocation(location) {
                try {
                    // First try a fallback for common locations to avoid CORS issues
                    const fallbackCoords = this.getFallbackCoordinates(location);
                    if (fallbackCoords) {
                        console.log('Using fallback coordinates for:', location);
                        return fallbackCoords;
                    }

                    // Use OpenStreetMap Nominatim (free, no API key) with proper headers
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&addressdetails=1`,
                        {
                            headers: {
                                'User-Agent': 'WeatherWidget/1.0'
                            }
                        }
                    );
                    
                    if (!response.ok) {
                        console.error('Geocoding response not ok:', response.status, response.statusText);
                        throw new Error(`Geocoding failed: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log('Geocoding response:', data);
                    
                    if (!data || data.length === 0) {
                        throw new Error('Location not found');
                    }
                    
                    const result = data[0];
                    
                    return {
                        coords: {
                            lat: parseFloat(result.lat),
                            lon: parseFloat(result.lon)
                        },
                        displayName: this.extractDisplayName(result)
                    };
                    
                } catch (error) {
                    console.error('Geocoding error details:', error);
                    // Try fallback coordinates one more time
                    const fallbackCoords = this.getFallbackCoordinates(location);
                    if (fallbackCoords) {
                        console.log('Using fallback coordinates after error for:', location);
                        return fallbackCoords;
                    }
                    throw new Error(`Geocoding error: ${error.message}`);
                }
            }

            getFallbackCoordinates(location) {
                const coords = {
                    'Tokyo, Japan': { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
                    'London, UK': { lat: 51.5074, lon: -0.1278, name: 'London' },
                    'Sydney, Australia': { lat: -33.8688, lon: 151.2093, name: 'Sydney' },
                    'Mumbai, India': { lat: 19.0760, lon: 72.8777, name: 'Mumbai' },
                    'Reykjavik, Iceland': { lat: 64.1466, lon: -21.9426, name: 'Reykjavik' },
                    'New York, NY': { lat: 40.7128, lon: -74.0060, name: 'New York' },
                    'Los Angeles, CA': { lat: 34.0522, lon: -118.2437, name: 'Los Angeles' },
                    'Paris, France': { lat: 48.8566, lon: 2.3522, name: 'Paris' },
                    'Berlin, Germany': { lat: 52.5200, lon: 13.4050, name: 'Berlin' },
                    '94513': { lat: 37.9318, lon: -121.6958, name: 'Brentwood' }
                };

                if (coords[location]) {
                    const coord = coords[location];
                    return {
                        coords: { lat: coord.lat, lon: coord.lon },
                        displayName: coord.name
                    };
                }

                return null;
            }

            extractDisplayName(geocodeResult) {
                // Extract a clean display name from geocode result
                const address = geocodeResult.address;
                if (!address) {
                    return geocodeResult.display_name.split(',')[0].trim();
                }
                
                // Prioritize city, town, village, etc.
                return address.city || 
                       address.town || 
                       address.village || 
                       address.municipality || 
                       address.county || 
                       address.state || 
                       geocodeResult.display_name.split(',')[0].trim();
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
                    timezone: data.timezone
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
                
                // Check if it's nighttime using the actual timezone
                const isNight = this.isNightTime();
                const weatherClass = isNight ? data.condition.nightClass : data.condition.dayClass;
                const effects = isNight ? data.condition.nightEffects : data.condition.dayEffects;
                
                // Update the outside view with day/night class
                const outsideView = this.shadowRoot.querySelector('.outside-view');
                outsideView.className = `outside-view ${weatherClass}${isNight ? ' night' : ''}`;
                
                // Get local time for the location
                const localTime = this.getLocalTime();
                const displayName = isNight ? 
                    (data.condition.name === 'Clear' ? 'Clear Night' : data.condition.name) :
                    (data.condition.name === 'Clear' ? 'Sunny' : data.condition.name);
                
                this.shadowRoot.querySelector('.weather-info').innerHTML = `
                    <div class="location">${this.currentLocationName || 'Unknown'}</div>
                    <div class="temp">${Math.round(data.main.temp)}${tempUnit}</div>
                    <div class="condition">${displayName}</div>
                    <div class="local-time">${localTime}</div>
                `;
                
                this.addWeatherEffects(effects, isNight);
            }

            isNightTime() {
                if (!this.currentTimezone) {
                    // Fallback to local time if no timezone available
                    const hour = new Date().getHours();
                    return hour >= 19 || hour < 6;
                }
                
                try {
                    const now = new Date();
                    const localTime = new Date(now.toLocaleString("en-US", {timeZone: this.currentTimezone}));
                    const hour = localTime.getHours();
                    // Night time is from 7 PM to 6 AM
                    return hour >= 19 || hour < 6;
                } catch (error) {
                    console.error('Timezone error:', error);
                    // Fallback to local time
                    const hour = new Date().getHours();
                    return hour >= 19 || hour < 6;
                }
            }

            getLocalTime() {
                if (!this.currentTimezone) {
                    return new Date().toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });
                }
                
                try {
                    const now = new Date();
                    return now.toLocaleTimeString('en-US', {
                        timeZone: this.currentTimezone,
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });
                } catch (error) {
                    console.error('Timezone error:', error, 'Timezone:', this.currentTimezone);
                    
                    // Fallback to local time
                    return new Date().toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });
                }
            }

            getDisplayName(location) {
                // Simple fallback for initial display before API call
                if (location && location.includes(',')) {
                    return location.split(',')[0].trim();
                }
                return location || 'Unknown';
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

            displayError(errorMessage = 'Connection lost') {
                const outsideView = this.shadowRoot.querySelector('.outside-view');
                outsideView.innerHTML = `<div class="loading">${errorMessage}</div>`;
                
                this.shadowRoot.querySelector('.weather-info').innerHTML = `
                    <div class="location">${this.currentLocationName || this.getDisplayName(this.getAttribute('location'))}</div>
                    <div class="temp">--°</div>
                    <div class="condition">Unable to load</div>
                    <div class="local-time">${new Date().toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    })}</div>
                `;
            }

            startTimeUpdates() {
                // Update time every minute and check for day/night changes
                this.timeInterval = setInterval(() => {
                    const timeElement = this.shadowRoot.querySelector('.local-time');
                    if (timeElement && timeElement.textContent !== '--:--' && this.currentTimezone) {
                        timeElement.textContent = this.getLocalTime();
                        
                        // Check if day/night status has changed
                        const currentIsNight = this.isNightTime();
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