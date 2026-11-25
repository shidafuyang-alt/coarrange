import io
import tempfile
import unittest
import wave
import array
import shutil
import subprocess
from pathlib import Path
from workers.pipeline import PipelineConfig, PipelineError, run_pipeline, run_command, mix_filter
from workers.spec import TaskSpec, ValidationError

def wav_bytes(seconds=4,rate=8000):
    out=io.BytesIO()
    with wave.open(out,'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
        f.writeframes(b'\x01\x00'*int(seconds*rate))
    return out.getvalue()

class PipelineTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.repo=self.root/'seed';self.repo.mkdir();(self.repo/'inference.py').write_text('#fixture')
        self.config=PipelineConfig(self.repo,ffmpeg='python3');self.calls=[]

    def tearDown(self):self.temp.cleanup()

    def fake_command(self,args,log,**kwargs):
        self.calls.append(args)
        if '-m' in args:
            path=Path(args[args.index('-o')+1])/'htdemucs'/'source';path.mkdir(parents=True)
            for name in ['vocals.wav','no_vocals.wav']:(path/name).write_bytes(wav_bytes())
        elif '--output' in args:
            (Path(args[args.index('--output')+1])/'converted.wav').write_bytes(wav_bytes())
        else:Path(args[-1]).write_bytes(wav_bytes())

    def test_pipeline_order_svc_pitch_and_exact_clip_length(self):
        stages=[]
        result=run_pipeline(self.config,self.root/'job',self.root/'s.mp3',self.root/'v.webm',{'duration':10,'clip_start':12,'vocal_gain_db':-2},lambda k,m:stages.append(k),runner=self.fake_command)
        self.assertEqual(stages,['normalize','separate','convert','mix'])
        self.assertEqual(set(result),{'result','source_clip','original_vocals','converted_vocals','accompaniment'})
        self.assertEqual(self.calls[0][self.calls[0].index('-ss')+1],'12')
        seed=self.calls[3]
        self.assertEqual(seed[seed.index('--f0-condition')+1],'True')
        self.assertEqual(seed[seed.index('--auto-f0-adjust')+1],'False')
        self.assertEqual(self.calls[4][self.calls[4].index('-t')+1],'4.0')
        self.assertIn('volume=-2dB',self.calls[4][self.calls[4].index('-filter_complex')+1])
        self.assertTrue(all(path.is_file() for path in result.values()))

    def test_missing_separated_stems_fails(self):
        def fake(args,log,**kwargs):
            if '-m' not in args:self.fake_command(args,log,**kwargs)
        with self.assertRaisesRegex(PipelineError,'Demucs'):run_pipeline(self.config,self.root/'job','s','v',{},runner=fake)

    def test_cancel_before_subprocess(self):
        with self.assertRaises(InterruptedError):run_pipeline(self.config,self.root/'job','s','v',{},canceled=lambda:True,runner=self.fake_command)
        self.assertEqual(self.calls,[])

    def test_command_failure_and_cancellation(self):
        import sys
        with self.assertRaises(PipelineError):run_command([sys.executable,'-c','raise SystemExit(3)'],self.root/'log',timeout=5)
        with self.assertRaises(InterruptedError):run_command([sys.executable,'-c','import time;time.sleep(30)'],self.root/'log',canceled=lambda:True)

class VoiceSpecTest(unittest.TestCase):
    def test_spec_rejects_unsafe_values(self):
        for value in [True, float('nan'), -1, 4000]:
            with self.subTest(value=value), self.assertRaises(ValidationError):
                TaskSpec.from_dict({'task':'voice_cover','clip_start':value})
        with self.assertRaises(ValidationError):
            TaskSpec.from_dict({'task':'cover'})

    def test_spec_drops_unknown_fields(self):
        spec=TaskSpec.from_dict({'task':'voice_cover','duration':20,'shell':'ignored'}).to_dict()
        self.assertNotIn('shell',spec)
        self.assertEqual(spec['duration'],20)


class MixAudioTest(unittest.TestCase):
    def test_real_ffmpeg_keeps_stereo_alignment_and_complete_clip(self):
        bundled = Path(__file__).resolve().parents[1] / 'node_modules/ffmpeg-static/ffmpeg'
        ffmpeg = shutil.which('ffmpeg') or (str(bundled) if bundled.is_file() else None)
        if not ffmpeg:
            self.skipTest('FFmpeg is not installed')
        with tempfile.TemporaryDirectory() as name:
            folder = Path(name)
            for filename, channels, position in [('voice.wav', 1, 1000), ('backing.wav', 2, 4000)]:
                frames = array.array('h', [0] * 4410 * channels)
                frames[position * channels + channels - 1] = 8192
                with wave.open(str(folder / filename), 'wb') as out:
                    out.setnchannels(channels);out.setsampwidth(2);out.setframerate(44100)
                    out.writeframes(frames.tobytes())
            subprocess.run([ffmpeg, '-nostdin', '-v', 'error', '-y',
                            '-i', str(folder / 'voice.wav'), '-i', str(folder / 'backing.wav'),
                            '-filter_complex', mix_filter(0), '-map', '[m]', '-t', '0.1',
                            '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le', str(folder / 'result.wav')],
                           check=True, capture_output=True, timeout=15)
            with wave.open(str(folder / 'result.wav'), 'rb') as result:
                self.assertEqual(result.getnframes(), 4410)
                self.assertEqual(result.getframerate(), 44100)
                self.assertEqual(result.getnchannels(), 2)
                frames = array.array('h', result.readframes(result.getnframes()))
            left, right = frames[::2], frames[1::2]
            self.assertGreater(abs(left[1000]), 4000)
            self.assertEqual(left[1000], right[1000])
            self.assertEqual(left[4000], 0)
            self.assertGreater(abs(right[4000]), 6000)
            self.assertEqual(sum(value != 0 for value in left), 1)
            self.assertEqual(sum(value != 0 for value in right), 2)

if __name__ == '__main__': unittest.main()
