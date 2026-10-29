import json
import math
from datetime import datetime, timezone


def main(timestamp: float) -> dict:
    if isinstance(timestamp, bool) or not isinstance(timestamp, (int, float)) or not math.isfinite(timestamp) or timestamp <= 0:
        raise ValueError("TRIGGER_TIMESTAMP")
    # At 09:00 Europe/Brussels the UTC and local calendar date always match.
    day = datetime.fromtimestamp(timestamp, timezone.utc).strftime("%Y-%m-%d")
    return {"result": json.dumps({"eventId": "native-schedule-" + day, "kind": "schedule"})}
