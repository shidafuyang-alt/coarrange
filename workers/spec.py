"""Bounded voice-worker request; independent of the original MusicCraft package."""
import math


class ValidationError(ValueError):
    pass


class TaskSpec:
    def __init__(self, value):
        self.value = value

    @classmethod
    def from_dict(cls, value):
        if not isinstance(value, dict) or value.get('task') != 'voice_cover':
            raise ValidationError('Worker accepts voice_cover only')
        result = {'task': 'voice_cover'}
        for key, default, low, high in [('duration', 20, 10, 40), ('clip_start', 0, 0, 3600), ('vocal_gain_db', 0, -12, 6)]:
            number = value.get(key, default)
            if isinstance(number, bool) or not isinstance(number, (int, float)) or not math.isfinite(number) or not low <= number <= high:
                raise ValidationError('Invalid ' + key)
            result[key] = number
        return cls(result)

    def to_dict(self):
        return self.value.copy()
