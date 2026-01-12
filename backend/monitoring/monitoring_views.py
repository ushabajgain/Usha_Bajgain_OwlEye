"""
Monitoring Views for SOS Dispatch System

Provides real-time metrics and health status endpoints
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .metrics import sos_metrics


class SOSMetricsView(APIView):
    """
    🔍 GET /monitoring/metrics/sos/
    
    Returns real-time metrics for SOS dispatch system:
    - SOS created / accepted / conflicts
    - Acceptance rates and times
    - Distance of accepting volunteers
    - Fallback frequency
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Return current SOS metrics"""
        metrics = sos_metrics.get_metrics()
        
        return Response({
            "status": "ok",
            "timestamp": str(__import__('datetime').datetime.now()),
            "metrics": metrics,
            "hourly_breakdown": sos_metrics.get_hourly_metrics()
        })


class SystemHealthView(APIView):
    """
    🏥 GET /monitoring/health/
    
    Returns system health indicators with PRODUCTION ALERTS:
    - Dispatch system operational status
    - Alert thresholds (acceptance rate, timeout rate, conflicts)
    - Coverage insights
    """
    permission_classes = [permissions.AllowAny]  # Public health check endpoint
    
    def get(self, request):
        """Return system health status with alerts"""
        metrics = sos_metrics.get_metrics()
        alerts = sos_metrics.check_thresholds()  # 🚨 NEW: Get threshold-based alerts
        
        # Determine health based on metrics + alerts
        if metrics.get("sos_created", 0) == 0:
            health_status = "initializing"
            health_color = "yellow"
        elif any("🔴" in alert for alert in alerts):  # Critical alert
            health_status = "critical"
            health_color = "red"
        elif any("⚠️" in alert for alert in alerts):  # Warning alert
            health_status = "warning"
            health_color = "yellow"
        else:
            health_status = "healthy"
            health_color = "green"
        
        return Response({
            "status": health_status,
            "color": health_color,
            "timestamp": str(__import__('datetime').datetime.now()),
            "details": {
                "sos_created_count": metrics.get("sos_created"),
                "acceptance_rate": metrics.get("acceptance_rate"),
                "conflict_rate": metrics.get("conflict_rate"),
                "fallback_rate": metrics.get("fallback_rate"),
                "timeout_rate": metrics.get("timeout_rate"),  # NEW: Timeout tracking
                "avg_response_time_seconds": metrics.get("avg_acceptance_time_seconds")
            },
            "alerts": alerts,  # 🚨 NEW: Threshold-based alerts
            "insights": sos_metrics.get_coverage_analysis().get("insights", [])  # NEW: Actionable insights
        })
