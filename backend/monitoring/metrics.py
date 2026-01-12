"""
SOS Dispatch System Metrics & Monitoring

🎯 PRODUCTION GRADE: Persistent Redis-backed metrics storage
Survives server restarts ✅ | Works across workers ✅

Tracks real-time metrics for:
- SOS acceptance rates
- Average response times
- Distance of accepting volunteers
- Fallback frequency
- 409 conflict rates
"""

from datetime import datetime, timedelta
from collections import defaultdict
import json
import logging
import redis
from django.conf import settings

logger = logging.getLogger('owl_eye.metrics')


class SOSMetrics:
    """
    🎯 Production-grade metrics: Redis-backed, persistent, worker-safe
    
    Redis Keys:
    - sos:created - Counter
    - sos:accepted - Counter
    - sos:conflicts - Counter
    - sos:timeouts - Counter
    - sos:fallback - Counter
    - sos:distances - List
    - sos:times - List
    """
    
    def __init__(self):
        # Connect to Redis
        try:
            self.redis_client = redis.Redis(
                host=settings.CHANNEL_LAYERS['default']['CONFIG']['hosts'][0][0],
                port=settings.CHANNEL_LAYERS['default']['CONFIG']['hosts'][0][1],
                db=1,  # Use db 1 for metrics (db 0 for channels)
                decode_responses=True
            )
            # Test connection
            self.redis_client.ping()
            logger.info("✅ Redis metrics store connected")
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}. Falling back to in-memory.")
            self.redis_client = None
        
        # Fallback in-memory storage if Redis unavailable
        self._fallback_metrics = {
            'sos_created': 0,
            'sos_accepted': 0,
            'sos_conflicts': 0,
            'sos_timeouts': 0,
            'fallback_triggered': 0,
            'distances': [],
            'times': []
        }
    
    def _get(self, key, default=0):
        """Get value from Redis or fallback"""
        if self.redis_client:
            try:
                val = self.redis_client.get(key)
                return int(val) if val else default
            except:
                pass
        return self._fallback_metrics.get(key, default)
    
    def _incr(self, key):
        """Increment counter in Redis or fallback"""
        if self.redis_client:
            try:
                return self.redis_client.incr(key)
            except:
                pass
        self._fallback_metrics[key] = self._fallback_metrics.get(key, 0) + 1
        return self._fallback_metrics[key]
    
    def _list_push(self, key, value):
        """Push to list in Redis or fallback"""
        if self.redis_client:
            try:
                return self.redis_client.rpush(key, float(value))
            except:
                pass
        if key not in self._fallback_metrics:
            self._fallback_metrics[key] = []
        self._fallback_metrics[key].append(float(value))
    
    def _list_get_all(self, key):
        """Get all list items from Redis or fallback"""
        if self.redis_client:
            try:
                vals = self.redis_client.lrange(key, 0, -1)
                return [float(v) for v in vals]
            except:
                pass
        return self._fallback_metrics.get(key, [])
    
    def log_sos_created(self, sos_id, event_id, nearby_count, fallback):
        """Log when SOS is created"""
        self._incr('sos:created')
        
        logger.info(
            f"[SOS_CREATED] id={sos_id} event={event_id} "
            f"nearby={nearby_count} fallback={'YES' if fallback else 'NO'}"
        )
        
        if fallback:
            self._incr('sos:fallback')
            logger.warning(f"[SOS_FALLBACK] SOS {sos_id} triggered fallback (no nearby volunteers)")
    
    def log_sos_accepted(self, sos_id, volunteer_name, distance_km, acceptance_seconds):
        """Log when volunteer accepts SOS"""
        self._incr('sos:accepted')
        self._list_push('sos:distances', distance_km)
        self._list_push('sos:times', acceptance_seconds)
        
        logger.info(
            f"[SOS_ACCEPTED] id={sos_id} volunteer={volunteer_name} "
            f"distance={distance_km:.2f}km response_time={acceptance_seconds:.1f}s"
        )
    
    def log_sos_conflict(self, sos_id, first_volunteer, second_volunteer):
        """Log when volunteer tries to accept already-accepted SOS (409)"""
        self._incr('sos:conflicts')
        
        logger.warning(
            f"[SOS_409_CONFLICT] id={sos_id} "
            f"already_accepted_by={first_volunteer} "
            f"rejected_volunteer={second_volunteer}"
        )
    
    def log_sos_timeout(self, sos_id, minutes=5):
        """Log when SOS not accepted within timeout window"""
        self._incr('sos:timeouts')
        logger.warning(f"[SOS_TIMEOUT] id={sos_id} not_accepted_within_{minutes}_min")
    
    def log_sos_completed(self, sos_id, completion_seconds):
        """Log when SOS is fully resolved (from creation to completion)"""
        self._list_push('sos:completion_times', completion_seconds)
        logger.info(f"[SOS_COMPLETED] id={sos_id} total_duration={completion_seconds:.1f}s")

    
    def log_sos_completed(self, sos_id, completion_seconds):
        """Log when SOS is fully resolved (from creation to completion)"""
        self._list_push('sos:completion_times', completion_seconds)
        logger.info(f"[SOS_COMPLETED] id={sos_id} total_duration={completion_seconds:.1f}s")

    
    def get_metrics(self):
        """Return current metrics snapshot (from Redis)"""
        sos_created = self._get('sos:created')
        
        if sos_created == 0:
            return {"status": "No data yet", "sos_created": 0}
        
        sos_accepted = self._get('sos:accepted')
        sos_conflicts = self._get('sos:conflicts')
        sos_timeouts = self._get('sos:timeouts')
        fallback_triggered = self._get('sos:fallback')
        
        # Calculate averages
        distances = self._list_get_all('sos:distances')
        avg_distance = sum(distances) / len(distances) if distances else 0
        
        times = self._list_get_all('sos:times')
        avg_acceptance_time = sum(times) / len(times) if times else 0
        min_time = min(times) if times else 0
        max_time = max(times) if times else 0
        
        # NEW: Completion time metrics
        completion_times = self._list_get_all('sos:completion_times')
        avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
        
        # Calculate rates
        acceptance_rate = (sos_accepted / sos_created) * 100 if sos_created > 0 else 0
        conflict_rate = (sos_conflicts / sos_created) * 100 if sos_created > 0 else 0
        fallback_rate = (fallback_triggered / sos_created) * 100 if sos_created > 0 else 0
        timeout_rate = (sos_timeouts / sos_created) * 100 if sos_created > 0 else 0
        
        return {
            "sos_created": sos_created,
            "sos_accepted": sos_accepted,
            "sos_conflicts": sos_conflicts,
            "sos_timeouts": sos_timeouts,
            "fallback_triggered": fallback_triggered,
            
            "acceptance_rate": f"{acceptance_rate:.1f}%",
            "conflict_rate": f"{conflict_rate:.1f}%",
            "fallback_rate": f"{fallback_rate:.1f}%",
            "timeout_rate": f"{timeout_rate:.1f}%",
            
            "avg_distance_km": round(avg_distance, 2),
            "avg_acceptance_time_seconds": round(avg_acceptance_time, 1),
            "avg_completion_time_seconds": round(avg_completion_time, 1),  # NEW: Total response duration
            
            "min_acceptance_time": round(min_time, 1),
            "max_acceptance_time": round(max_time, 1),
        }
    
    def check_thresholds(self):
        """
        🚨 PRODUCTION ALERT: Check if metrics fall below target thresholds
        
        Returns list of alert strings if thresholds violated
        """
        metrics = self.get_metrics()
        alerts = []
        
        if metrics.get('sos_created', 0) == 0:
            return alerts
        
        # Parse rates (they're strings like "80.0%")
        try:
            acceptance = float(metrics['acceptance_rate'].rstrip('%'))
            timeout = float(metrics['timeout_rate'].rstrip('%'))
            conflict = float(metrics['conflict_rate'].rstrip('%'))
            
            # Thresholds
            if acceptance < 70:
                alerts.append(f"🔴 CRITICAL: Acceptance rate {acceptance:.1f}% (target: >70%)")
            elif acceptance < 80:
                alerts.append(f"⚠️  WARNING: Acceptance rate {acceptance:.1f}% (target: >80%)")
            
            if timeout > 15:
                alerts.append(f"🔴 CRITICAL: Timeout rate {timeout:.1f}% (max: 15%)")
            elif timeout > 10:
                alerts.append(f"⚠️  WARNING: Timeout rate {timeout:.1f}% (max: 10%)")
            
            if conflict > 20:
                alerts.append(f"⚠️  WARNING: Conflict rate {conflict:.1f}% (expected: <20%)")
            
            # NEW: Check completion time (should be <180 seconds for full resolution)
            completion_time = metrics.get('avg_completion_time_seconds', 0)
            if completion_time > 300:
                alerts.append(f"🔴 CRITICAL: Avg completion {completion_time:.1f}s (target: <300s)")
            elif completion_time > 180:
                alerts.append(f"⚠️  WARNING: Avg completion {completion_time:.1f}s (target: <180s)")
                
        except:
            pass
        
        return alerts
    
    def check_database_timeouts(self, timeout_minutes=5):
        """
        ⚠️ PRODUCTION: Check database for SOS that haven't been accepted within timeout
        
        This finds REAL unanswered SOS (not just logged timeouts).
        Critical for detecting coverage gaps.
        
        Args:
            timeout_minutes: Threshold (default 5 minutes)
        
        Returns:
            list: [{'sos_id': X, 'minutes_since_created': Y, 'event_id': Z}, ...]
        """
        try:
            from .models import SOSAlert
            from django.utils import timezone
            
            threshold_time = timezone.now() - timedelta(minutes=timeout_minutes)
            
            # Find SOS created over X minutes ago but still not assigned
            timed_out_sos = SOSAlert.objects.filter(
                created_at__lt=threshold_time,
                assigned_volunteer__isnull=True,
                status='reported'
            ).values_list('id', 'created_at', 'event_id')
            
            result = []
            for sos_id, created_at, event_id in timed_out_sos:
                minutes_since = (timezone.now() - created_at).total_seconds() / 60
                result.append({
                    'sos_id': sos_id,
                    'minutes_since_created': round(minutes_since, 1),
                    'event_id': event_id
                })
                
                # Auto-log timeout in metrics
                if not any(t['sos_id'] == sos_id for t in getattr(self, 'logged_timeouts', [])):
                    self.log_sos_timeout(sos_id, minutes=timeout_minutes)
            
            return result
        except Exception as e:
            logger.error(f"[METRICS_ERROR] Failed to check database timeouts: {e}")
            return []
    
    def get_coverage_analysis(self):
        """
        🔍 Analyze coverage gaps based on actual data (from Redis)
        
        Returns:
            dict with insights about system performance
        """
        metrics = self.get_metrics()
        
        if metrics.get('sos_created', 0) == 0:
            return {"status": "No data", "insights": []}
        
        try:
            acceptance_rate = float(metrics['acceptance_rate'].rstrip('%'))
            conflict_rate = float(metrics['conflict_rate'].rstrip('%'))
            fallback_rate = float(metrics['fallback_rate'].rstrip('%'))
            timeout_rate = float(metrics['timeout_rate'].rstrip('%'))
            avg_distance = metrics['avg_distance_km']
        except:
            return {"status": "Parse error", "insights": []}
        
        insights = []
        
        # Acceptance Analysis
        if acceptance_rate < 60:
            insights.append({
                "severity": "🔴 critical",
                "message": f"Only {acceptance_rate:.0f}% SOS accepted - severe coverage gap",
                "action": "Increase volunteers, expand radius"
            })
        elif acceptance_rate < 80:
            insights.append({
                "severity": "⚠️  warning",
                "message": f"Acceptance {acceptance_rate:.0f}% below 85% target",
                "action": "Monitor volunteer distribution"
            })
        
        # Fallback Analysis
        if fallback_rate > 30:
            insights.append({
                "severity": "⚠️  warning",
                "message": f"Fallback {fallback_rate:.0f}% - limited proximity coverage",
                "action": "Increase SOS_PROXIMITY_RADIUS_KM or add volunteers"
            })
        
        # Timeout Analysis
        if timeout_rate > 10:
            insights.append({
                "severity": "🔴 critical",
                "message": f"{timeout_rate:.0f}% SOS timed out",
                "action": "Check volunteer connectivity, verify broadcast"
            })
        
        # Conflict Analysis
        if conflict_rate > 20:
            insights.append({
                "severity": "ℹ️  info",
                "message": f"High contention: {conflict_rate:.0f}% race conditions",
                "action": "Normal under load, monitor response time"
            })
        
        return {"status": "operational", "insights": insights}

    
    def reset(self):
        """Reset all metrics (for testing)"""
        if self.redis_client:
            try:
                keys = ['sos:created', 'sos:accepted', 'sos:conflicts', 'sos:timeouts', 
                        'sos:fallback', 'sos:distances', 'sos:times']
                for key in keys:
                    self.redis_client.delete(key)
                logger.info("✅ Metrics reset in Redis")
            except Exception as e:
                logger.warning(f"⚠️ Failed to reset Redis metrics: {e}")
        else:
            self._fallback_metrics = {
                'sos_created': 0,
                'sos_accepted': 0,
                'sos_conflicts': 0,
                'sos_timeouts': 0,
                'fallback_triggered': 0,
                'distances': [],
                'times': []
            }


# Global metrics instance  
sos_metrics = SOSMetrics()

