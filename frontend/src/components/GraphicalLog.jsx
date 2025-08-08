import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import DOTLogSheet from './DOTLogSheet';

const GraphicalLog = forwardRef(({ tripData }, ref) => {
    const logSheetRefs = useRef([]);
    
    useImperativeHandle(ref, () => ({
        generatePDF: async () => {
            const canvasDataUrls = [];
            for (let i = 0; i < logSheetRefs.current.length; i++) {
                if (logSheetRefs.current[i]) {
                    const dataUrl = await logSheetRefs.current[i].generatePDFContent();
                    if (dataUrl) canvasDataUrls.push(dataUrl);
                }
            }
            return canvasDataUrls;
        }
    }));
    if (!tripData || !tripData.logs || tripData.logs.length === 0) {
        return (
            <div className="p-8 text-center bg-gray-100 rounded-lg shadow-inner">
                <div className="text-gray-600 mb-4">
                    Your completed graphical logs will appear here after calculation.
                </div>
                <div className="text-sm text-gray-500">
                    Each day of your trip will be displayed as a separate DOT-compliant log sheet.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Driver's Daily Log Sheets</h2>
                <p className="text-gray-600">
                    DOT-compliant log sheets showing your Hours of Service (HOS) for each day of the trip.
                    Each log sheet represents exactly 24 hours and shows your duty status throughout the day.
                </p>
            </div>
            
            {tripData.logs.map((logData, index) => (
                <DOTLogSheet 
                    key={index}
                    ref={el => logSheetRefs.current[index] = el}
                    logData={logData}
                    dayNumber={logData.day || index + 1}
                    routeData={tripData}
                    driverInfo={{
                        name: tripData.log_info?.driver_name || 'Driver Name',
                        carrier: tripData.log_info?.carrier_name || 'Your Company LLC'
                    }}
                />
            ))}
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Trip Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <div className="font-medium text-gray-700">Total Days</div>
                        <div className="text-blue-600 font-semibold">{tripData.logs.length}</div>
                    </div>
                    <div>
                        <div className="font-medium text-gray-700">Total Distance</div>
                        <div className="text-blue-600 font-semibold">
                            {tripData.total_distance_miles?.toFixed(1) || 0} miles
                        </div>
                    </div>
                    <div>
                        <div className="font-medium text-gray-700">Driving Time</div>
                        <div className="text-blue-600 font-semibold">
                            {tripData.total_driving_time_hours?.toFixed(1) || 0} hours
                        </div>
                    </div>
                    <div>
                        <div className="font-medium text-gray-700">Log Sheets</div>
                        <div className="text-blue-600 font-semibold">{tripData.logs.length}</div>
                    </div>
                </div>
            </div>
        </div>
    );
});

GraphicalLog.displayName = 'GraphicalLog';

export default GraphicalLog;