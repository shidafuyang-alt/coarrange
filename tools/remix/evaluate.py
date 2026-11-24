"""Melody salience: how often the sung pitch class is the strongest in 330-3960 Hz.

Usage: evaluate.py melody.json a.wav b.wav ...
The misaligned baseline scores the same audio shifted 3.1, 6.3 and 9.7 s.
"""
import json,sys
import librosa,numpy as np
from scipy.ndimage import median_filter
c=json.load(open(sys.argv[1]))["contour"]
v=np.array([x is not None for x in c]);m=median_filter(np.array([x or 0 for x in c]),9)
def score(path,shift=0):
  y,sr=librosa.load(path,sr=22050)
  C=librosa.amplitude_to_db(abs(librosa.cqt(y,sr=sr,hop_length=256,fmin=librosa.midi_to_hz(52),n_bins=44)),ref=np.max)
  t=librosa.times_like(C,sr=sr,hop_length=256);F=np.arange(len(m))/100
  hit=[]
  for i in np.where(v)[0]:
    j=np.argmin(abs(t-(F[i]+shift)%20)); lo=10**(C[:,max(0,j-3):j+4].mean(1)/20)
    pc=np.array([lo[np.arange(44)%12==k].max() for k in range(12)]); # bin0=E
    want=(int(round(m[i]))-52)%12
    hit.append(np.argsort(-pc).tolist().index(want))
  hit=np.array(hit);return (hit==0).mean(),(hit<3).mean()
def chance(path):return np.mean([score(path,s) for s in(3.1,6.3,9.7)],0)
if __name__=='__main__':
  for p in sys.argv[2:]:print(p.split('/')[-1],'top1 %.2f top3 %.2f'%score(p),'| misaligned baseline %.2f %.2f'%tuple(chance(p)))
