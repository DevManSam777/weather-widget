class WeatherWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.timeInterval = null;
        this.weatherInterval = null;
        this.currentTimezone = null;
        this.currentLocationName = null;
        this.loadingState = false;
        this.sunriseTime = null;
        this.sunsetTime = null;
    }

    static get observedAttributes() {
        return ['location', 'units'];
    }

    connectedCallback() {
        this.render();
        this.loadWeatherData();
        this.startTimeUpdates();
        this.startWeatherUpdates();
    }

    disconnectedCallback() {
        if (this.timeInterval) {
            clearInterval(this.timeInterval);
        }
        if (this.weatherInterval) {
            clearInterval(this.weatherInterval);
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && !this.loadingState) {
            this.loadWeatherData();
        }
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
            const weatherData = await this.fetchWeatherFromWeatherAPI(location, units);
            console.log(`Weather data loaded for ${location}:`, weatherData);
            this.displayWeather(weatherData);
        } catch (error) {
            console.error(`Failed to load weather for ${location}:`, error);
            this.displayError(error.message);
        } finally {
            this.loadingState = false;
        }
    }

    async fetchWeatherFromWeatherAPI(location, units) {
        const apiKey = '595f7617e8694a44abe15716251406';
        const currentUrl = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(location)}&aqi=no`;
        const astronomyUrl = `https://api.weatherapi.com/v1/astronomy.json?key=${apiKey}&q=${encodeURIComponent(location)}`;
        
        console.log(`Fetching weather from WeatherAPI: ${currentUrl}`);

        try {
            const [weatherResponse, astronomyResponse] = await Promise.all([
                fetch(currentUrl),
                fetch(astronomyUrl)
            ]);
            
            if (!weatherResponse.ok) {
                throw new Error(`WeatherAPI returned ${weatherResponse.status}: ${weatherResponse.statusText}`);
            }

            const weatherData = await weatherResponse.json();
            
            console.log('Raw WeatherAPI response:', weatherData);
            console.log('Temperature F:', weatherData.current.temp_f);
            console.log('Temperature C:', weatherData.current.temp_c);
            
            if (!weatherData.current) {
                throw new Error('Invalid weather data received from WeatherAPI');
            }

            this.currentLocationName = weatherData.location.name;
            this.currentTimezone = weatherData.location.tz_id;
            
            if (astronomyResponse.ok) {
                const astronomyData = await astronomyResponse.json();
                if (astronomyData.astronomy && astronomyData.astronomy.astro) {
                    this.sunriseTime = astronomyData.astronomy.astro.sunrise;
                    this.sunsetTime = astronomyData.astronomy.astro.sunset;
                    console.log(`Sunrise: ${this.sunriseTime}, Sunset: ${this.sunsetTime}`);
                }
            }
            
            console.log(`Location: ${this.currentLocationName}, Timezone: ${this.currentTimezone}`);

            return this.parseWeatherAPIData(weatherData, units);
            
        } catch (error) {
            console.error('WeatherAPI error:', error);
            throw new Error(`Unable to fetch weather data: ${error.message}`);
        }
    }

    parseWeatherAPIData(data, units) {
        const current = data.current;
        const temperature = units === 'F' ? Math.round(current.temp_f) : Math.round(current.temp_c);
        const condition = this.mapWeatherAPICondition(current.condition.text, current.condition.code, current.wind_kph);
        
        return {
            temperature: temperature,
            condition: condition,
            windSpeed: Math.round(units === 'F' ? current.wind_mph : current.wind_kph),
            humidity: current.humidity,
            timezone: data.location.tz_id
        };
    }

    mapWeatherAPICondition(conditionText, conditionCode, windKph) {
        const text = conditionText.toLowerCase();
        
        if (text.includes('sunny') || text.includes('clear')) {
            return { name: 'Clear', dayClass: 'sunny', nightClass: 'sunny', dayEffects: 'sun', nightEffects: 'moon-stars' };
        }
        if (text.includes('partly cloudy') || text.includes('partly')) {
            return { name: 'Partly Cloudy', dayClass: 'partly-cloudy', nightClass: 'partly-cloudy', dayEffects: 'sun-clouds', nightEffects: 'moon-clouds' };
        }
        if (text.includes('cloudy') || text.includes('overcast')) {
            return { name: 'Cloudy', dayClass: 'cloudy', nightClass: 'cloudy', dayEffects: 'more-clouds', nightEffects: 'more-clouds' };
        }
        if (text.includes('rain') || text.includes('drizzle') || text.includes('shower')) {
            return { name: 'Rain', dayClass: 'rainy', nightClass: 'rainy', dayEffects: 'rain', nightEffects: 'rain' };
        }
        if (text.includes('snow') || text.includes('blizzard')) {
            return { name: 'Snow', dayClass: 'snowy', nightClass: 'snowy', dayEffects: 'snow', nightEffects: 'snow' };
        }
        if (text.includes('thunder') || text.includes('storm')) {
            return { name: 'Thunderstorm', dayClass: 'stormy', nightClass: 'stormy', dayEffects: 'lightning', nightEffects: 'lightning' };
        }
        if (text.includes('fog') || text.includes('mist')) {
            return { name: 'Foggy', dayClass: 'foggy', nightClass: 'foggy', dayEffects: 'fog', nightEffects: 'fog' };
        }
        
        if (windKph > 20) { 
            return { name: 'Windy', dayClass: 'windy', nightClass: 'windy', dayEffects: 'windy-effects', nightEffects: 'windy-effects' };
        }

        return { name: 'Partly Cloudy', dayClass: 'partly-cloudy', nightClass: 'partly-cloudy', dayEffects: 'sun-clouds', nightEffects: 'moon-clouds' };
    }

    isNightTime() {
        if (!this.currentTimezone) {
            const hour = new Date().getHours();
            return hour >= 19 || hour < 6;
        }

        try {
            const now = new Date();
            
            if (this.sunriseTime && this.sunsetTime) {
                const currentTimeStr = now.toLocaleTimeString('en-US', { 
                    timeZone: this.currentTimezone,
                    hour12: true, 
                    hour: 'numeric', 
                    minute: '2-digit' 
                });
                
                const sunriseTime = this.parseTimeString(this.sunriseTime);
                const sunsetTime = this.parseTimeString(this.sunsetTime);
                const currentTime = this.parseTimeString(currentTimeStr);
                
                console.log(`Debug: Current: ${currentTimeStr} (${currentTime}), Sunrise: ${this.sunriseTime} (${sunriseTime}), Sunset: ${this.sunsetTime} (${sunsetTime})`);
                
                return currentTime < sunriseTime || currentTime >= sunsetTime;
            }
            
            const hour = parseInt(now.toLocaleTimeString('en-US', { 
                timeZone: this.currentTimezone,
                hour: 'numeric',
                hour12: false 
            }).split(':')[0]);
            
            return hour >= 19 || hour < 6;
            
        } catch (error) {
            console.error('Timezone error:', error);
            const hour = new Date().getHours();
            return hour >= 19 || hour < 6;
        }
    }

    parseTimeString(timeStr) {
        const [time, period] = timeStr.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        
        let totalMinutes = (hours % 12) * 60 + minutes;
        if (period === 'PM' && hours !== 12) {
            totalMinutes += 12 * 60;
        } else if (period === 'AM' && hours === 12) {
            totalMinutes = minutes;
        }
        
        return totalMinutes;
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
        outsideView.innerHTML = '';
        
        switch(effects) {
            case 'sun':
                outsideView.innerHTML = '<div class="sun"></div>';
                break;
            case 'moon':
                outsideView.innerHTML = '<div class="moon"></div>';
                break;
            case 'moon-stars':
                outsideView.innerHTML = '<div class="moon"></div>';
                this.createStars();
                break;
            case 'clouds':
                outsideView.innerHTML = '<div class="cloud cloud-1"></div><div class="cloud cloud-2"></div><div class="cloud cloud-3"></div>';
                break;
            case 'more-clouds':
                outsideView.innerHTML = '<div class="cloud cloud-1"></div><div class="cloud cloud-2"></div><div class="cloud cloud-3"></div><div class="cloud cloud-4"></div><div class="cloud cloud-5"></div>';
                break;
            case 'sun-clouds':
                outsideView.innerHTML = '<div class="sun"></div><div class="cloud cloud-1"></div><div class="cloud cloud-2"></div>';
                break;
            case 'moon-clouds':
                outsideView.innerHTML = '<div class="moon"></div><div class="cloud cloud-1"></div><div class="cloud cloud-2"></div>';
                break;
            case 'rain':
                this.createRain();
                break;
            case 'snow':
                this.createSnow();
                break;
            case 'lightning':
                outsideView.innerHTML = '<div class="cloud cloud-1"></div><div class="cloud cloud-2"></div><div class="lightning">⚡</div>';
                this.createRain();
                break;
            case 'fog':
                this.createFog();
                break;
            case 'windy-effects':
                this.createWindyEffects();
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

    createStars() {
        const outsideView = this.shadowRoot.querySelector('.outside-view');
        for (let i = 0; i < 15; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.textContent = '✦';
            star.style.left = Math.random() * 90 + 5 + '%';
            star.style.top = Math.random() * 60 + 10 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            star.style.animationDuration = (Math.random() * 2 + 2) + 's';
            outsideView.appendChild(star);
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

    createFog() {
        const outsideView = this.shadowRoot.querySelector('.outside-view');
        const fogLayer1 = document.createElement('div');
        fogLayer1.className = 'fog-layer fog-layer-1';
        outsideView.appendChild(fogLayer1);

        const fogLayer2 = document.createElement('div');
        fogLayer2.className = 'fog-layer fog-layer-2';
        outsideView.appendChild(fogLayer2);

        const fogLayer3 = document.createElement('div');
        fogLayer3.className = 'fog-layer fog-layer-3';
        outsideView.appendChild(fogLayer3);
    }

    createWindyEffects() {
        const outsideView = this.shadowRoot.querySelector('.outside-view');
        outsideView.innerHTML = '<div class="cloud cloud-1"></div><div class="cloud cloud-2"></div>';
        for (let i = 0; i < 10; i++) {
            const windLine = document.createElement('div');
            windLine.className = 'wind-line';
            windLine.style.left = Math.random() * 100 + '%';
            windLine.style.top = Math.random() * 100 + '%';
            windLine.style.animationDelay = Math.random() * 1.5 + 's';
            outsideView.appendChild(windLine);
        }
    }

    startTimeUpdates() {
        this.timeInterval = setInterval(() => {
            const timeElement = this.shadowRoot.querySelector('.local-time');
            if (timeElement && this.currentTimezone) {
                const newTime = this.getLocalTime();
                if (timeElement.textContent !== newTime) {
                    timeElement.textContent = newTime;
                    
                    const currentWeatherInfo = this.shadowRoot.querySelector('.weather-info');
                    if (currentWeatherInfo && this.currentLocationName) {
                        const tempElement = this.shadowRoot.querySelector('.temp');
                        if (tempElement && tempElement.textContent !== '--°') {
                            const outsideView = this.shadowRoot.querySelector('.outside-view');
                            const isNight = this.isNightTime();
                            
                            if (isNight && !outsideView.classList.contains('night')) {
                                outsideView.classList.add('night');
                            } else if (!isNight && outsideView.classList.contains('night')) {
                                outsideView.classList.remove('night');
                            }
                        }
                    }
                }
            }
        }, 60000);
    }

    startWeatherUpdates() {
        if (this.weatherInterval) {
            clearInterval(this.weatherInterval);
        }

        console.log('Setting up automatic weather updates every 15 minutes');

        this.weatherInterval = setInterval(() => {
            console.log('Auto-refreshing weather data...');
            this.loadWeatherData();
        }, 15 * 60 * 1000);
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
                
                .sunny {
                    background: linear-gradient(to bottom, #87CEEB 0%, #87CEEB 95%, #228B22 95%, #228B22 100%);
                }
                
                .cloudy {
                    background: linear-gradient(to bottom, #B0C4DE 0%, #B0C4DE 95%, #228B22 95%, #228B22 100%);
                }

                .foggy {
                    background: linear-gradient(to bottom, #B0C4DE 0%, #D3D3D3 95%, #505050 95%, #505050 100%);
                }

                .windy {
                    background: linear-gradient(to bottom, #87CEEB 0%, #87CEEB 95%, #228B22 95%, #228B22 100%);
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
                
                .sunny.night {
                    background: linear-gradient(to bottom, #191970 0%, #191970 95%, #1F3F1F 95%, #1F3F1F 100%);
                }
                
                .cloudy.night {
                    background: linear-gradient(to bottom, #2F2F4F 0%, #2F2F4F 95%, #1F3F1F 95%, #1F3F1F 100%);
                }

                .foggy.night {
                    background: linear-gradient(to bottom, #303040 0%, #505060 95%, #202020 95%, #202020 100%);
                }

                .windy.night {
                    background: linear-gradient(to bottom, #2F2F5F 0%, #2F2F5F 95%, #1F3F1F 95%, #1F3F1F 100%);
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
                    top: -10px;
                    left: 5px;
                }
                
                .cloud-2::after {
                    width: 35px;
                    height: 20px;
                    top: -8px;
                    right: 5px;
                }
                
                .cloud-3 {
                    width: 70px;
                    height: 22px;
                    top: 60px;
                    left: 80px;
                    animation: float 7s ease-in-out infinite;
                }
                
                .cloud-3::before {
                    width: 35px;
                    height: 35px;
                    top: -18px;
                    left: 15px;
                }
                
                .cloud-3::after {
                    width: 45px;
                    height: 30px;
                    top: -12px;
                    right: 15px;
                }

                .cloud-4 {
                    width: 55px;
                    height: 19px;
                    top: 40px;
                    left: 120px;
                    animation: float 6.5s ease-in-out infinite reverse;
                }

                .cloud-4::before {
                    width: 28px;
                    height: 28px;
                    top: -12px;
                    left: 8px;
                }

                .cloud-4::after {
                    width: 38px;
                    height: 22px;
                    top: -9px;
                    right: 8px;
                }

                .cloud-5 {
                    width: 65px;
                    height: 21px;
                    top: 70px;
                    right: 20px;
                    animation: float 7.5s ease-in-out infinite;
                }

                .cloud-5::before {
                    width: 32px;
                    height: 32px;
                    top: -16px;
                    left: 12px;
                }

                .cloud-5::after {
                    width: 42px;
                    height: 28px;
                    top: -11px;
                    right: 12px;
                }
                
                @keyframes float {
                    0% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                    100% { transform: translateY(0); }
                }
                
                .star {
                    position: absolute;
                    font-size: 10px;
                    color: white;
                    opacity: 0;
                    animation: twinkle 4s ease-in-out infinite;
                    z-index: 4;
                    text-shadow: 0 0 5px rgba(255,255,255,0.7);
                }
                
                @keyframes twinkle {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 1; }
                }
                
                .lightning {
                    position: absolute;
                    top: 30%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 80px;
                    color: yellow;
                    opacity: 0;
                    animation: strike 2s infinite;
                    z-index: 10;
                    text-shadow: 0 0 20px yellow;
                }
                
                @keyframes strike {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 1; }
                    51% { opacity: 0; }
                }

                .fog-layer {
                    position: absolute;
                    width: 150%;
                    height: 80%;
                    background: rgba(255, 255, 255, 0.6);
                    border-radius: 50%;
                    filter: blur(15px);
                    opacity: 0;
                    animation: drift 15s ease-in-out infinite;
                    z-index: 8;
                }

                .fog-layer-1 {
                    top: 50%;
                    left: -20%;
                    transform: translateY(-50%) scale(1.2);
                    animation-delay: 0s;
                    width: 130%;
                }

                .fog-layer-2 {
                    top: 40%;
                    left: -10%;
                    transform: translateY(-50%) scale(1.1);
                    animation-delay: 5s;
                    width: 140%;
                    background: rgba(255, 255, 255, 0.5);
                }

                .fog-layer-3 {
                    top: 60%;
                    left: -30%;
                    transform: translateY(-50%) scale(1.3);
                    animation-delay: 10s;
                    width: 120%;
                    background: rgba(255, 255, 255, 0.7);
                }

                @keyframes drift {
                    0% { transform: translateX(0) scale(1); opacity: 0.8; }
                    50% { transform: translateX(30%) scale(1.1); opacity: 0.6; }
                    100% { transform: translateX(0) scale(1); opacity: 0.8; }
                }

                .wind-line {
                    position: absolute;
                    width: 20px;
                    height: 2px;
                    background: rgba(255, 255, 255, 0.7);
                    border-radius: 1px;
                    transform: rotate(-15deg);
                    animation: gust 1s ease-out infinite;
                    opacity: 0;
                    z-index: 9;
                }

                @keyframes gust {
                    0% { transform: translateX(-20px) rotate(-15deg); opacity: 0; }
                    50% { transform: translateX(100px) rotate(-15deg); opacity: 1; }
                    100% { transform: translateX(200px) rotate(-15deg); opacity: 0; }
                }
                
                .loading {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: white;
                    font-family: -apple-system, system-ui, sans-serif;
                    font-size: 18px;
                    text-align: center;
                }
            </style>
            <div class="window">
                <div class="outside-view">
                    <div class="loading">Loading Weather...</div>
                </div>
                <div class="glass-overlay"></div>
                <div class="window-frame"></div>
                <div class="weather-info">
                    <div class="location">${location}</div>
                    <div class="temp">--°</div>
                    <div class="condition">Loading...</div>
                    <div class="local-time">--:-- --</div>
                </div>
            </div>
        `;
    }
}

customElements.define('weather-widget', WeatherWidget);