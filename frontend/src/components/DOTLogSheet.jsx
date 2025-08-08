import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const DOTLogSheet = forwardRef(({ logData, dayNumber, driverInfo = {}, routeData = {} }, ref) => {
    const canvasRef = useRef(null);
    
    useImperativeHandle(ref, () => ({
        getCanvas: () => canvasRef.current,
        generatePDFContent: async () => {
            if (!canvasRef.current) return null;
            const canvas = canvasRef.current;
            return canvas.toDataURL('image/png', 1.0);
        }
    }));

    // DOT Log Sheet Layout Constants (based on standard DOT log format)
    const CANVAS_WIDTH = 1200;
    const CANVAS_HEIGHT = 800;
    
    // Header section
    const HEADER_Y = 50;
    const DATE_X = 200, DATE_Y = HEADER_Y;
    const DRIVER_NAME_X = 500, DRIVER_NAME_Y = HEADER_Y;
    const CARRIER_X = 800, CARRIER_Y = HEADER_Y;
    
    // Grid section (24-hour timeline)
    const GRID_START_X = 100;
    const GRID_START_Y = 120;
    const GRID_WIDTH = 960; // 24 hours * 40px per hour
    const HOUR_WIDTH = 40;
    const ROW_HEIGHT = 40;
    
    // Status rows
    const STATUS_ROWS = [
        { status: 'Off Duty', y: GRID_START_Y, color: '#000000' },
        { status: 'Sleeper Berth', y: GRID_START_Y + ROW_HEIGHT, color: '#000000' },
        { status: 'Driving', y: GRID_START_Y + ROW_HEIGHT * 2, color: '#FF0000' },
        { status: 'On Duty', y: GRID_START_Y + ROW_HEIGHT * 3, color: '#000000' }
    ];
    
    // Totals section
    const TOTALS_X = GRID_START_X + GRID_WIDTH + 50;
    
    // Remarks section
    const REMARKS_Y = GRID_START_Y + ROW_HEIGHT * 5;
    const REMARKS_HEIGHT = 200;
    
    // Miles section (moved below remarks to avoid overlapping totals)
    const MILES_Y = REMARKS_Y + REMARKS_HEIGHT + 20;

    useEffect(() => {
        if (!logData || !canvasRef.current) return;
        
        // Debug: Log the data structure
        console.log('DOT Log Data for Day', dayNumber, ':', logData);
        console.log('Events:', logData.events);
        
        // Validate totals
        const calculatedTotals = calculateTotals(logData.events || []);
        const grandTotal = Object.values(calculatedTotals).reduce((sum, val) => sum + val, 0);
        console.log('Calculated Totals:', calculatedTotals);
        console.log('Grand Total:', grandTotal.toFixed(2), '(should be 24.00)');
        
        if (Math.abs(grandTotal - 24) > 0.01) {
            console.warn(`⚠️ DOT Log Day ${dayNumber}: Total hours = ${grandTotal.toFixed(2)} (should be 24.00)`);
        }
        
        // DOT Legal Compliance Validation
        const drivingHours = calculatedTotals['Driving'] || 0;
        const onDutyHours = (calculatedTotals['On Duty'] || 0) + drivingHours;
        
        console.log('=== DOT COMPLIANCE CHECK ===');
        console.log(`Day ${dayNumber} - Driving: ${drivingHours.toFixed(2)}h, Total On-Duty: ${onDutyHours.toFixed(2)}h`);
        
        if (drivingHours > 11) {
            console.error(`❌ VIOLATION: Driving time ${drivingHours.toFixed(2)}h exceeds 11-hour limit`);
        }
        if (onDutyHours > 14) {
            console.error(`❌ VIOLATION: On-duty time ${onDutyHours.toFixed(2)}h exceeds 14-hour limit`);
        }
        if (drivingHours > 0 && drivingHours <= 11 && onDutyHours <= 14) {
            console.log('✅ DOT HOS Compliance: PASSED');
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        
        // Clear canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Removed outer border per request
        // Previously:
        // ctx.strokeStyle = '#000000';
        // ctx.lineWidth = 2;
        // ctx.strokeRect(20, 20, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 40);
        
        // Draw header
        drawHeader(ctx);
        
        // Draw grid
        drawGrid(ctx);
        
        // Draw status lines based on events
        drawStatusLines(ctx, logData.events);
        
        // Draw arrows along the bottom for each remark time
        drawRemarkArrows(ctx, logData.events);
        
        // Draw vertical remark labels aligned to the arrows
        drawRemarkVerticalLabels(ctx, logData.events);
        
        // Draw totals - always compute locally with 24h capping
        const safeTotals = calculateTotals(logData.events);
        drawTotals(ctx, safeTotals);
        
        // Draw remarks
        drawRemarks(ctx, logData.events);
        
    }, [logData]);

    const drawHeader = (ctx) => {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        
        // Title
        ctx.textAlign = 'center';
        ctx.fillText('DRIVER\'S DAILY LOG', CANVAS_WIDTH / 2, 30);
        
        // Date
        ctx.textAlign = 'left';
        ctx.font = '12px Arial';
        const today = new Date();
        const dateStr = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;
        ctx.fillText(`Date: ${dateStr}`, DATE_X, DATE_Y);
        
        // Driver info with complete details
        ctx.font = '11px Arial';
        ctx.fillText(`Driver: ${driverInfo.name || routeData.log_info?.driver_name || 'Mahder Tesfaye Abebe'}`, DRIVER_NAME_X, DRIVER_NAME_Y);
        ctx.fillText(`License: ${routeData.log_info?.driver_license || 'DL123456789'} (${routeData.log_info?.license_state || 'CA'})`, DRIVER_NAME_X, DRIVER_NAME_Y + 15);
        
        ctx.fillText(`Carrier: ${driverInfo.carrier || routeData.log_info?.carrier_name || 'Tesfaye Trucking Company'}`, CARRIER_X, CARRIER_Y);
        ctx.fillText(`Truck: ${routeData.log_info?.truck_number || 'TT-2024-001'} | Trailer: ${routeData.log_info?.trailer_number || 'TR-2024-001'}`, CARRIER_X, CARRIER_Y + 15);
        
        // Day number and additional info
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`Day: ${dayNumber || 1}`, 50, DATE_Y);
        
        // Co-driver line (defaults to Tesfaye Abebe if not provided)
        ctx.font = '10px Arial';
        const coDriverName = routeData.log_info?.co_driver || 'Tesfaye Abebe';
        ctx.fillText(`Co-Driver: ${coDriverName}`, 50, DATE_Y + 20);
        
        // Miles Today (moved to header)
        // Compute today's miles based on driving hours proportion of trip driving hours
        const dayDrivingHours = (logData?.events || []).reduce((sum, ev) => sum + (ev.status === 'Driving' ? (ev.duration || 0) / 3600 : 0), 0);
        const tripTotalDrivingHours = Number(routeData.total_driving_time_hours) || 0;
        const tripTotalMiles = Number(routeData.total_distance_miles) || 0;
        let dayMiles = 0;
        if (tripTotalDrivingHours > 0 && tripTotalMiles > 0) {
            dayMiles = Math.round(tripTotalMiles * (dayDrivingHours / tripTotalDrivingHours));
        }
        // Always show Miles Today, even if 0 (no fallback to trip miles)
        const milesText = `Miles Today: ${dayMiles}`;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(milesText, CANVAS_WIDTH - 40, DATE_Y + 20); // top-right area
        ctx.textAlign = 'left';
        
        // Route (moved to header, top-right, below miles)
        if (routeData.start_location && routeData.dropoff_location) {
            const startName = routeData.start_location.formatted_name || routeData.start_location.name || '';
            const endName = routeData.dropoff_location.formatted_name || routeData.dropoff_location.name || '';
            const routeLine = `Route: ${startName} → ${endName}`;
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(routeLine, CANVAS_WIDTH - 40, DATE_Y + 34);
            ctx.textAlign = 'left';
        }
    };

    const drawGrid = (ctx) => {
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1;
        
        // Draw vertical lines (hours)
        for (let hour = 0; hour <= 24; hour++) {
            const x = GRID_START_X + (hour * HOUR_WIDTH);
            ctx.beginPath();
            ctx.moveTo(x, GRID_START_Y);
            ctx.lineTo(x, GRID_START_Y + ROW_HEIGHT * 4);
            ctx.stroke();
            
            // Hour labels
            if (hour % 2 === 0) { // Every 2 hours
                ctx.fillStyle = '#000000';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(hour.toString().padStart(2, '0'), x, GRID_START_Y - 5);
            }
        }
        
        // Draw horizontal lines (status rows)
        STATUS_ROWS.forEach((row, index) => {
            const y = row.y;
            ctx.beginPath();
            ctx.moveTo(GRID_START_X, y);
            ctx.lineTo(GRID_START_X + GRID_WIDTH, y);
            ctx.stroke();
            
            // Row labels
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            const labelX = GRID_START_X - 10;
            if (row.status === 'Sleeper Berth') {
                // Write on two lines to prevent overlap with border
                ctx.fillText('Sleeper', labelX, y + 11);
                ctx.fillText('Berth', labelX, y + 23);
            } else {
                ctx.fillText(row.status, labelX, y + 15);
            }
        });
        
        // Bottom border of grid
        ctx.beginPath();
        ctx.moveTo(GRID_START_X, GRID_START_Y + ROW_HEIGHT * 4);
        ctx.lineTo(GRID_START_X + GRID_WIDTH, GRID_START_Y + ROW_HEIGHT * 4);
        ctx.stroke();
    };

    const drawStatusLines = (ctx, events) => {
        if (!events || events.length === 0) {
            console.warn('No events to draw on DOT log');
            return;
        }
        
        console.log(`Drawing status lines for ${events.length} events`);
        
        ctx.lineWidth = 3;
        
        let currentTime = 0; // Start at hour 0
        let lastY = getStatusY('Off Duty'); // Start at Off Duty line
        
        ctx.beginPath();
        ctx.moveTo(GRID_START_X, lastY + ROW_HEIGHT / 2);
        
        events.forEach((event, index) => {
            const durationHours = event.duration / 3600;
            const endTime = Math.min(currentTime + durationHours, 24);
            
            console.log(`Event ${index}: ${event.status} from ${currentTime.toFixed(2)}h to ${endTime.toFixed(2)}h (${durationHours.toFixed(2)}h duration)`);
            
            const startX = GRID_START_X + (currentTime * HOUR_WIDTH);
            const endX = GRID_START_X + (endTime * HOUR_WIDTH);
            const currentY = getStatusY(event.status);
            
            // Validate status
            if (!STATUS_ROWS.find(r => r.status === event.status)) {
                console.warn(`⚠️ Unknown status: ${event.status}`);
            }
            
            // Draw vertical line if status changes
            if (currentY !== lastY) {
                ctx.lineTo(startX, lastY + ROW_HEIGHT / 2);
                ctx.lineTo(startX, currentY + ROW_HEIGHT / 2);
            }
            
            // Draw horizontal line for this status
            ctx.lineTo(endX, currentY + ROW_HEIGHT / 2);
            
            lastY = currentY;
            currentTime = endTime;
            
            if (currentTime >= 24) {
                console.log('Reached 24 hours, stopping line drawing');
                return;
            }
        });
        
        // DOT Compliance: If events don't cover full 24 hours, extend with Off Duty
        if (currentTime < 24) {
            const finalX = GRID_START_X + (24 * HOUR_WIDTH);
            const offDutyY = getStatusY('Off Duty');
            
            // Draw vertical line to Off Duty if needed
            if (lastY !== offDutyY) {
                const currentX = GRID_START_X + (currentTime * HOUR_WIDTH);
                ctx.lineTo(currentX, lastY + ROW_HEIGHT / 2);
                ctx.lineTo(currentX, offDutyY + ROW_HEIGHT / 2);
            }
            
            // Draw horizontal line to end of day
            ctx.lineTo(finalX, offDutyY + ROW_HEIGHT / 2);
            console.log(`Extended status line to 24 hours with Off Duty from ${currentTime.toFixed(2)}h`);
        }
        
        // Draw the entire duty status line in red (single color)
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.stroke();
    };

    // Draw small arrows at the bottom grid line for each remark start time
    const drawRemarkArrows = (ctx, events) => {
        if (!events || events.length === 0) return;
        const baseY = GRID_START_Y + ROW_HEIGHT * 4; // bottom of the grid
        let cumulativeHours = 0;
        let labelIndex = 1;
        
        events.forEach((event) => {
            const hasRemark = !!event.remarks;
            const startH = Math.max(0, Math.min(24, cumulativeHours));
            const x = GRID_START_X + startH * HOUR_WIDTH;
            
            if (hasRemark) {
                // Arrow shaft
                ctx.strokeStyle = '#1F2937'; // slate-800
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, baseY);
                ctx.lineTo(x, baseY - 10);
                ctx.stroke();
                
                // Arrow head (small triangle)
                ctx.fillStyle = '#1F2937';
                ctx.beginPath();
                ctx.moveTo(x, baseY - 10);
                ctx.lineTo(x - 3, baseY - 5);
                ctx.lineTo(x + 3, baseY - 5);
                ctx.closePath();
                ctx.fill();
                
                // Numeric label under the baseline
                ctx.fillStyle = '#374151';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(String(labelIndex), x, baseY + 12);
                labelIndex += 1;
            }
            cumulativeHours += (event.duration || 0) / 3600;
            if (cumulativeHours > 24) cumulativeHours = 24;
        });
    };

    // Render remark text vertically under the bottom grid line at each remark start time
    const drawRemarkVerticalLabels = (ctx, events) => {
        if (!events || events.length === 0) return;
        const baseY = GRID_START_Y + ROW_HEIGHT * 4; // bottom of the grid
        // Sit the text just under the arrow/number, very close to the table bottom
        const labelsBaseY = baseY + 16;
        let cumulativeHours = 0;
        
        // Utility: truncate text to avoid excessive overlap
        const truncate = (str, max = 28) => (str && str.length > max ? str.slice(0, max - 1) + '…' : (str || ''));
        
        events.forEach((event) => {
            // Only label events that have something meaningful to say
            const hasRemark = !!(event.remarks || event.description || event.location);
            if (!hasRemark) {
                cumulativeHours += (event.duration || 0) / 3600;
                if (cumulativeHours > 24) cumulativeHours = 24;
                return;
            }
            const startH = Math.max(0, Math.min(24, cumulativeHours));
            const x = GRID_START_X + startH * HOUR_WIDTH;
            
            // Compose two-line label: Location first, Activity second
            const locTextRaw = (typeof event.location === 'string') ? event.location : (event.location?.name || '');
            const locationLine = truncate(locTextRaw || 'Location', 20);
            const activityBase = event.description || event.remarks || 'Activity';
            const activityLine = truncate(activityBase, 20);
            
            ctx.save();
            // Translate to the anchor point and rotate CW 90°; anchor is top-left
            ctx.translate(x, labelsBaseY);
            ctx.rotate(Math.PI / 2); // clockwise 90 degrees
            ctx.fillStyle = '#374151'; // slate-700
            ctx.font = '9px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            // First line: Location (origin is top-left)
            ctx.fillText(locationLine, 0, 0);
            // Second line below: Activity (12px line height)
            ctx.fillText(activityLine, 0, 12);
            ctx.restore();
            
            cumulativeHours += (event.duration || 0) / 3600;
            if (cumulativeHours > 24) cumulativeHours = 24;
        });
    };

    const getStatusY = (status) => {
        const row = STATUS_ROWS.find(r => r.status === status);
        return row ? row.y : STATUS_ROWS[0].y;
    };

    const calculateTotals = (events) => {
        const totals = { 'Off Duty': 0, 'Sleeper Berth': 0, 'Driving': 0, 'On Duty': 0 };
        
        let assignedHours = 0;
        const MAX_HOURS = 24;
        
        if (!events || events.length === 0) {
            // Entire day Off Duty
            totals['Off Duty'] = MAX_HOURS;
            return totals;
        }
        
        for (const event of events) {
            if (assignedHours >= MAX_HOURS) break;
            const remaining = MAX_HOURS - assignedHours;
            const eventHours = Math.min((event.duration || 0) / 3600, remaining);
            if (totals.hasOwnProperty(event.status)) {
                totals[event.status] += eventHours;
            }
            assignedHours += eventHours;
        }
        
        // If we have less than 24 hours covered, fill the remainder as Off Duty
        if (assignedHours < MAX_HOURS) {
            const remainder = MAX_HOURS - assignedHours;
            totals['Off Duty'] += remainder;
        }
        
        return totals;
    };

    const drawTotals = (ctx, totals) => {
        // Helper to format decimal hours as H:MM
        const formatHoursMinutes = (hoursFloat) => {
            const totalMinutes = Math.round((hoursFloat || 0) * 60);
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            return `${h}:${m.toString().padStart(2, '0')}`;
        };

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        
        // Compute a centered X within the right-side panel area
        const panelLeft = GRID_START_X + GRID_WIDTH + 10;
        const panelRight = CANVAS_WIDTH - 40; // right border
        const centerX = (panelLeft + panelRight) / 2;
        
        // Header
        ctx.fillText('TOTALS', centerX, GRID_START_Y - 10);
        
        // Per-status totals, vertically aligned with the grid rows, centered in the side panel
        STATUS_ROWS.forEach((row) => {
            const total = totals[row.status] || 0;
            ctx.fillText(formatHoursMinutes(total), centerX, row.y + 15);
        });
        
        // Grand total centered below the grid (should read 24:00)
        const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`Total: ${formatHoursMinutes(grandTotal)}`, centerX, GRID_START_Y + ROW_HEIGHT * 4 + 25);
    };

    const drawRemarks = (ctx, events) => {
        // Simple label under the table, directly below the duties labels
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'right';
        // Place at the same x as row labels (GRID_START_X - 10), just below the bottom grid line
        const labelX = GRID_START_X - 10;
        const labelY = GRID_START_Y + ROW_HEIGHT * 4 + 15;
        ctx.fillText('Remarks', labelX, labelY);
        ctx.textAlign = 'left';
        
        // (Miles Today and Route moved to header) — do not print them here anymore
    };

    return (
        <div className="w-full bg-white p-4 rounded-lg shadow-lg">
            <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                    DOT Driver's Daily Log - Day {dayNumber}
                </h3>
                <p className="text-gray-600">
                    Official Hours of Service (HOS) compliance log sheet
                </p>
            </div>
            
            <canvas 
                ref={canvasRef} 
                className="w-full h-auto border border-gray-300 rounded"
                style={{ maxWidth: '100%', height: 'auto' }}
            />
            
            <div className="mt-4 text-sm text-gray-600">
                <p><strong>Instructions:</strong> This log shows your duty status for each hour of the day.</p>
                <p><strong>Red Line:</strong> Duty status line for all statuses throughout the 24-hour period.</p>
            </div>
        </div>
    );
});

DOTLogSheet.displayName = 'DOTLogSheet';

export default DOTLogSheet;
