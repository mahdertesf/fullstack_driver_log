# Driver Log System - DOT-Compliant Trip Planning & HOS Management

A comprehensive full-stack application designed for commercial truck drivers and fleet managers to plan long-haul trips while ensuring full compliance with Department of Transportation (DOT) Hours of Service (HOS) regulations. The system automatically calculates optimal driving schedules, mandatory breaks, and rest periods, generating official DOT-compliant log sheets.

## 🚛 What This Application Does

### Core Purpose
This application solves the complex problem of planning multi-day trucking trips while maintaining strict compliance with federal DOT regulations. It eliminates the guesswork and manual calculations that drivers typically face when planning long-haul routes.

### Key Problems Solved
- **HOS Compliance**: Automatically ensures drivers never exceed 11-hour daily driving limits, 14-hour on-duty windows, or 70-hour weekly cycles
- **Break Management**: Intelligently schedules mandatory 30-minute breaks every 8 hours of driving
- **Rest Planning**: Calculates optimal 10-hour daily rest periods and 34-hour weekly restarts
- **Multi-day Trips**: Handles complex trips spanning multiple calendar days with proper log sheet management
- **Route Optimization**: Integrates with real-world routing data to provide accurate time and distance calculations

### Who Benefits
- **Commercial Truck Drivers**: Plan trips with confidence, knowing they'll stay compliant
- **Fleet Managers**: Monitor driver schedules and ensure regulatory compliance
- **Logistics Companies**: Optimize delivery schedules while maintaining safety standards
- **Safety Departments**: Generate audit-ready documentation for DOT inspections

## 🏗️ System Architecture

### Backend (Django + Python)
- **Django REST Framework**: Provides robust API endpoints for trip calculations
- **HOS Calculator Engine**: Core business logic implementing DOT regulations
- **OpenRouteService Integration**: Real-world routing and geocoding services
- **SQLite Database**: Stores trip history and user data
- **PostgreSQL Ready**: Configured for production database scaling

### Frontend (React + Modern Web Stack)
- **React 18**: Modern, responsive user interface
- **Vite**: Fast development and optimized production builds
- **Tailwind CSS**: Beautiful, mobile-first styling
- **Leaflet Maps**: Interactive route visualization
- **PDF Generation**: Official DOT log sheet export capabilities

## 📋 Detailed Features

### 1. Trip Planning Interface
- **Location Input**: Start location, pickup point, and delivery destination
- **Cycle Hours Tracking**: Input current weekly hours worked
- **Real-time Validation**: Immediate feedback on trip feasibility
- **Autocomplete Search**: Powered by OpenRouteService geocoding

### 2. HOS Compliance Engine
The system implements a sophisticated decision-making hierarchy:

```
1. Weekly Reset Check (70-hour limit)
2. Daily Reset Check (14-hour on-duty window)
3. Driving Break Check (8-hour driving limit)
4. Planned Tasks (pre-trip, pickup, dropoff, fueling)
5. Driving (using minimum value rule)
```

### 3. Time Bank Management
Four critical time banks are continuously monitored:
- **Daily Driving Bank**: Tracks remaining daily driving hours (11-hour limit)
- **Daily On-Duty Window**: Monitors 14-hour continuous work window
- **Break Cycle Bank**: Ensures 30-minute breaks every 8 hours
- **Weekly Cycle Bank**: Tracks 70-hour rolling 8-day period

### 4. Visual Trip Management
- **Interactive Map**: Real-time route visualization with event markers
- **Detailed Itinerary**: Hour-by-hour breakdown of driver activities
- **Status Indicators**: Clear visual representation of HOS compliance
- **Event Timeline**: Chronological view of all planned activities

### 5. Official Documentation
- **DOT Log Sheets**: Generate official daily log sheets
- **PDF Export**: Professional, print-ready documentation
- **Compliance Validation**: Automatic verification of all HOS rules
- **Audit Trail**: Complete history of all trip calculations

### 6. Trip History Management
- **Save & Recall**: Store successful trip plans for future reference
- **Bulk Operations**: Delete individual trips or clear entire history
- **Recalculation**: Re-run calculations with updated parameters
- **Export Options**: Download trip data in multiple formats

## 🔧 Technical Implementation

### HOS Regulations Implemented
- **11-Hour Daily Driving Limit**: Maximum driving time per day
- **14-Hour On-Duty Window**: Continuous work period limit
- **8-Hour Driving Before Break**: Mandatory 30-minute break requirement
- **70-Hour Weekly Cycle**: Rolling 8-day work period limit
- **10-Hour Daily Rest**: Minimum off-duty time per day
- **34-Hour Weekly Restart**: Optional reset of weekly cycle
- **30-Minute Break**: Required after 8 hours of driving

### API Endpoints
```
POST /api/calculate-trip/     # Calculate new trip with HOS compliance
GET  /api/trip-history/       # Retrieve saved trips
POST /api/trip-history/       # Save new trip
GET  /api/trip-history/{id}/  # Get specific trip details
DELETE /api/trip-history/{id}/ # Delete specific trip
DELETE /api/trip-history/     # Clear all trip history
```

### Data Flow
1. **User Input** → Location data and cycle hours
2. **Route Calculation** → OpenRouteService API integration
3. **HOS Processing** → Time bank calculations and compliance checks
4. **Event Generation** → Detailed activity timeline
5. **Response Formatting** → Structured data for frontend consumption
6. **Visual Rendering** → Maps, itineraries, and log sheets

## 🚀 Getting Started

### Prerequisites
- Python 3.10+ (Backend)
- Node.js 18+ (Frontend)
- OpenRouteService API Key (Free registration required)

### Installation

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your ORS_API_KEY
python manage.py migrate
python manage.py runserver
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### Environment Configuration
Create `backend/.env`:
```env
SECRET_KEY=your-secure-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
ORS_API_KEY=your-openrouteservice-api-key
```

### Access Points
- **Backend API**: http://127.0.0.1:8000/
- **Frontend Application**: http://127.0.0.1:5173/
- **API Documentation**: http://127.0.0.1:8000/api/

## 📊 Usage Examples

### Basic Trip Calculation
    ```json
POST /api/calculate-trip/
    {
      "start_location": "New York, NY, USA",
      "pickup_location": "Columbus, OH, USA",
      "dropoff_location": "Chicago, IL, USA",
      "cycle_hours_used": 8
    }
    ```

### Response Structure
```json
{
  "route_geometry": [...],
  "logs": [
    {
      "date": "2024-01-15",
      "events": [
        {
          "status": "Driving",
          "duration": 8.5,
          "location": "New York, NY",
          "start_time_hours": 6.0,
          "remark": "Drive to Columbus"
        }
      ]
    }
  ],
  "trip_summary": {
    "total_distance": 1200,
    "total_duration": 72.5,
    "days_required": 3
  }
}
```

## 🔒 Compliance & Safety Features

### Automatic Violation Prevention
- **Real-time Monitoring**: Continuous HOS limit tracking
- **Proactive Alerts**: Warnings before limit violations
- **Break Reminders**: Automatic 30-minute break scheduling
- **Rest Enforcement**: Mandatory 10-hour daily rest periods

### Audit-Ready Documentation
- **Official Log Sheets**: DOT-compliant daily logs
- **Compliance Verification**: Automatic rule validation
- **Historical Records**: Complete trip history maintenance
- **Export Capabilities**: PDF and data export options

## 🛠️ Development & Deployment

### Development Commands
```bash
# Frontend
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build

# Backend  
python manage.py runserver    # Development server
python manage.py migrate      # Database migrations
python manage.py collectstatic # Static file collection
```

### Production Deployment
- **Frontend**: Deploy to static hosting (Netlify, Vercel, S3+CloudFront)
- **Backend**: Deploy to cloud platforms (Heroku, AWS, DigitalOcean)
- **Database**: Use managed PostgreSQL for production
- **Environment**: Set `DEBUG=False` and configure production settings

### Security Considerations
- **API Key Protection**: Secure OpenRouteService API key management
- **CORS Configuration**: Proper cross-origin request handling
- **Input Validation**: Comprehensive request data validation
- **Rate Limiting**: API usage monitoring and limits

## 📈 Performance & Scalability

### Optimization Features
- **Route Caching**: Intelligent caching of calculated routes
- **Database Indexing**: Optimized queries for trip history
- **Frontend Optimization**: Code splitting and lazy loading
- **API Response Compression**: Efficient data transmission

### Scalability Considerations
- **Database Scaling**: PostgreSQL for production workloads
- **API Rate Limits**: OpenRouteService usage optimization
- **Caching Strategy**: Redis integration for high-traffic scenarios
- **Load Balancing**: Horizontal scaling capabilities

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Code Standards
- **Python**: Follow PEP 8 guidelines
- **JavaScript**: Use ESLint configuration
- **Documentation**: Update README for new features
- **Testing**: Maintain test coverage

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support & Troubleshooting

### Common Issues
- **ORS API Errors**: Verify API key and check rate limits
- **CORS Issues**: Ensure django-cors-headers is properly configured
- **Port Conflicts**: Change backend port if needed (`runserver 8001`)
- **Database Errors**: Run migrations and check database connectivity

### Getting Help
- **Documentation**: Check the comprehensive Jupyter notebook guide
- **API Testing**: Use the built-in API endpoints for debugging
- **Log Analysis**: Review console logs for detailed error information

---

**Prepared by: Mahder Tesfaye Abebe**

This application represents a complete solution for DOT-compliant trip planning, combining modern web technologies with sophisticated regulatory compliance logic to ensure driver safety and regulatory adherence.