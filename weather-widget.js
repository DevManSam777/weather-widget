class WeatherWidget extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
                this.timeInterval = null;
                this.currentTimezone = null;
                this.currentLocationName = null;
                this.loadingState = false;
            }

            static get observedAttributes() {
                return ['location', 'units'];
            }

            connectedCallback() {
                this.render();
                this.loadWeatherData();
                this.startTimeUpdates();
            }

            disconnectedCallback() {
                if (this.timeInterval) {
                    clearInterval(this.timeInterval);
                }
            }

            attributeChangedCallback(name, oldValue, newValue) {
                if (oldValue !== newValue && !this.loadingState) {
                    this.loadWeatherData();
                }
            }

            // Location database with coordinates and timezone info
            getLocationData() {
                return {
                    'Tokyo, Japan': { 
                        lat: 35.6762, lon: 139.6503, name: 'Tokyo', 
                        timezone: 'Asia/Tokyo', country: 'Japan' 
                    },
                    'London, UK': { 
                        lat: 51.5074, lon: -0.1278, name: 'London', 
                        timezone: 'Europe/London', country: 'UK' 
                    },
                    'Sydney, Australia': { 
                        lat: -33.8688, lon: 151.2093, name: 'Sydney', 
                        timezone: 'Australia/Sydney', country: 'Australia' 
                    },
                    'Mumbai, India': { 
                        lat: 19.0760, lon: 72.8777, name: 'Mumbai', 
                        timezone: 'Asia/Kolkata', country: 'India' 
                    },
                    'Reykjavik, Iceland': { 
                        lat: 64.1466, lon: -21.9426, name: 'Reykjavik', 
                        timezone: 'Atlantic/Reykjavik', country: 'Iceland' 
                    },
                    'New York, NY': { 
                        lat: 40.7128, lon: -74.0060, name: 'New York', 
                        timezone: 'America/New_York', country: 'USA' 
                    },
                    'Los Angeles, CA': { 
                        lat: 34.0522, lon: -118.2437, name: 'Los Angeles', 
                        timezone: 'America/Los_Angeles', country: 'USA' 
                    },
                    'Paris, France': { 
                        lat: 48.8566, lon: 2.3522, name: 'Paris', 
                        timezone: 'Europe/Paris', country: 'France' 
                    },
                    'Berlin, Germany': { 
                        lat: 52.5200, lon: 13.4050, name: 'Berlin', 
                        timezone: 'Europe/Berlin', country: 'Germany' 
                    },
                    'Chicago, IL': { 
                        lat: 41.8781, lon: -87.6298, name: 'Chicago', 
                        timezone: 'America/Chicago', country: 'USA' 
                    },
                    '94513': { 
                        lat: 37.9318, lon: -121.6958, name: 'Brentwood', 
                        timezone: 'America/Los_Angeles', country: 'USA' 
                    },
                    '10001': { 
                        lat: 40.7128, lon: -74.0060, name: 'New York', 
                        timezone: 'America/New_York', country: 'USA' 
                    },
                    '90210': { 
                        lat: 34.0901, lon: -118.4065, name: 'Beverly Hills', 
                        timezone: 'America/Los_Angeles', country: 'USA' 
                    }
                };
            }

            async loadWeatherData() {
                if (this.loadingState) return;
                this.loadingState = true;

                const location = this.getAttribute('location');
                const units = this.getAttribute('units') || 'F';

                if (!location) {
                    this.loadingState = false;
                    return;
                }

                console.log(`Loading weather for: ${location}`);

                try {
                    // Get location data
                    const locationData = this.getLocationData()[location];
                    
                    if (!locationData) {
                        throw new Error(`Location "${location}" not found in database`);
                    }

                    this.currentLocationName = locationData.name;
                    this.currentTimezone = locationData.timezone;

                    // Fetch weather data
                    const weatherData = await this.fetchWeatherFromAPI(locationData, units);
                    
                    console.log(`Weather data loaded for ${location}:`, weatherData);
                    
                    this.displayWeather(weatherData);
                    
                } catch (error) {
                    console.error(`Failed to load weather for ${location}:`, error);
                    this.displayError(error.message);
                } finally {
                    this.loadingState = false;
                }
            }

            async fetchWeatherFromAPI(locationData, units) {
                const tempUnit = units === 'F' ? 'fahrenheit' : 'celsius';
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${locationData.lat}&longitude=${locationData.lon}&current_weather=true&temperature_unit=${tempUnit}&timezone=auto`;
                
                console.log(`Fetching weather from: ${url}`);

                try {
                    const response = await fetch(url);
                    
                    if (!response.ok) {
                        throw new Error(`Weather API returned ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();
                    console.log('Raw weather data:', data);

                    if (!data.current_weather) {
                        throw new Error('Invalid weather data received');
                    }

                    return this.parseWeatherData(data);
                    
                } catch (error) {
                    console.error('Weather API error:', error);
                    // Return mock data as fallback
                    return this.getMockWeatherData(units);
                }
            }

            parseWeatherData(data) {
                const current = data.current_weather;
                const condition = this.mapWeatherCode(current.weathercode);
                
                return {
                    temperature: Math.round(current.temperature),
                    condition: condition,
                    windSpeed: Math.round(current.windspeed),
                    timezone: data.timezone || this.currentTimezone
                };
            }

            getMockWeatherData(units) {
                console.log('Using mock weather data as fallback');
                const temp = units === 'F' ? 72 : 22;
                return {
                    temperature: temp,
                    condition: {
                        name: 'Partly Cloudy',
                        dayClass: 'partly-cloudy',
                        nightClass: 'partly-cloudy',
                        dayEffects: 'sun-clouds',
                        nightEffects: 'moon-clouds'
                    },
                    windSpeed: 8,
                    timezone: this.currentTimezone
                };
            }

            mapWeatherCode(code) {
                const conditions = {
                    0: { name: 'Clear', dayClass: 'sunny', nightClass: 'sunny', dayEffects: 'sun', nightEffects: 'moon' },
                    1: { name: 'Partly Cloudy', dayClass: 'partly-cloudy', nightClass: 'partly-cloudy', dayEffects: 'sun-clouds', nightEffects: 'moon-clouds' },
                    2: { name: 'Partly Cloudy', dayClass: 'partly-cloudy', nightClass: 'partly-cloudy', dayEffects: 'sun-clouds', nightEffects: 'moon-clouds' },
                    3: { name: 'Overcast', dayClass: 'cloudy', nightClass: 'cloudy', dayEffects: 'clouds', nightEffects: 'clouds' },
                    45: { name: 'Foggy', dayClass: 'cloudy', nightClass: 'cloudy', dayEffects: 'clouds', nightEffects: 'clouds' },
                    48: { name: 'Foggy', dayClass: 'cloudy', nightClass: 'cloudy', dayEffects: 'clouds', nightEffects: 'clouds' },
                    51: { name: 'Light Rain', dayClass: 'rainy', nightClass: 'rainy', dayEffects: 'rain', nightEffects: 'rain' },
                    53: { name: 'Rain', dayClass: 'rainy', nightClass: 'rainy', dayEffects: 'rain', nightEffects: 'rain' },
                    55: { name: 'Heavy Rain', dayClass: 'rainy', nightClass: 'rainy', dayEffects: 'rain', nightEffects: 'rain' },
                    71: { name: 'Light Snow', dayClass: 'snowy', nightClass: 'snowy', dayEffects: 'snow', nightEffects: 'snow' },
                    73: { name: 'Snow', dayClass: 'snowy', nightClass: 'snowy', dayEffects: 'snow', nightEffects: 'snow' },
                    75: { name: 'Heavy Snow', dayClass: 'snowy', nightClass: 'snowy', dayEffects: 'snow', nightEffects: 'snow' },
                    95: { name: 'Thunderstorm', dayClass: 'stormy', nightClass: 'stormy', dayEffects: 'lightning', nightEffects: 'lightning' },
                    96: { name: 'Thunderstorm', dayClass: 'stormy', nightClass: 'stormy', dayEffects: 'lightning', nightEffects: 'lightning' },
                    99: { name: 'Thunderstorm', dayClass: 'stormy', nightClass: 'stormy', dayEffects: 'lightning', nightEffects: 'lightning' }
                };

                return conditions[code] || conditions[1]; // Default to partly cloudy
            }

            isNightTime() {
                if (!this.currentTimezone) {
                    const hour = new Date().getHours();
                    return hour >= 19 || hour < 6;
                }

                try {
                    const now = new Date();
                    const localTime = new Date(now.toLocaleString("en-US", { timeZone: this.currentTimezone }));
                    const hour = localTime.getHours();
                    return hour >= 19 || hour < 6;
                } catch (error) {
                    console.error('Timezone error:', error);
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
                    console.error('Time formatting error:', error);
                    return new Date().toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });
                }
            }

            displayWeather(weatherData) {
                const units = this.getAttribute('units') || 'F';
                const tempUnit = units === 'F' ? '°F' : '°C';
                const isNight = this.isNightTime();
                
                const weatherClass = isNight ? weatherData.condition.nightClass : weatherData.condition.dayClass;
                const effects = isNight ? weatherData.condition.nightEffects : weatherData.condition.dayEffects;
                
                const outsideView = this.shadowRoot.querySelector('.outside-view');
                outsideView.className = `outside-view ${weatherClass}${isNight ? ' night' : ''}`;
                
                const localTime = this.getLocalTime();
                const conditionName = isNight && weatherData.condition.name === 'Clear' ? 'Clear Night' : 
                                    !isNight && weatherData.condition.name === 'Clear' ? 'Sunny' : 
                                    weatherData.condition.name;

                this.shadowRoot.querySelector('.weather-info').innerHTML = `
                    <div class="location">${this.currentLocationName || 'Unknown'}</div>
                    <div class="temp">${weatherData.temperature}${tempUnit}</div>
                    <div class="condition">${conditionName}</div>
                    <div class="local-time">${localTime}</div>
                `;

                this.addWeatherEffects(effects);
            }

            displayError(message) {
                const outsideView = this.shadowRoot.querySelector('.outside-view');
                outsideView.innerHTML = `<div class="loading">Error: ${message}</div>`;
                
                this.shadowRoot.querySelector('.weather-info').innerHTML = `
                    <div class="location">${this.currentLocationName || this.getAttribute('location') || 'Unknown'}</div>
                    <div class="temp">--°</div>
                    <div class="condition">Unable to load</div>
                    <div class="local-time">${this.getLocalTime()}</div>
                `;
            }

            addWeatherEffects(effects) {
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

            startTimeUpdates() {
                this.timeInterval = setInterval(() => {
                    const timeElement = this.shadowRoot.querySelector('.local-time');
                    if (timeElement && this.currentTimezone) {
                        const newTime = this.getLocalTime();
                        if (timeElement.textContent !== newTime) {
                            timeElement.textContent = newTime;
                        }
                    }
                }, 60000); // Update every minute
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
                            max-width: 200px;
                        }
                    </style>
                    
                    <div class="window">
                        <div class="outside-view cloudy">
                            <div class="loading">Loading weather...</div>
                        </div>
                        <div class="glass-overlay"></div>
                        <div class="window-frame"></div>
                        <div class="weather-info">
                            <div class="location">${location.split(',')[0]}</div>
                            <div class="temp">--°</div>
                            <div class="condition">Loading...</div>
                            <div class="local-time">--:--</div>
                        </div>
                    </div>
                `;
            }
        }

        // Register the custom element
        customElements.define('weather-widget', WeatherWidget);