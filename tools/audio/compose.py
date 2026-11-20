import json, math, struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2] / "artifacts" / "audio"
ROOT.mkdir(parents=True, exist_ok=True)
beat=60/108
# An original eight-bar melody, repeated with an octave/ending variation.
theme=[[(76,1),(79,.5),(76,.5),(74,1),(72,1)],[(72,1.5),(69,.5),(72,1),(74,1)],[(76,1),(79,1),(81,.5),(79,.5),(76,1)],[(74,1.5),(71,.5),(67,1),(71,1)],[(76,.5),(79,.5),(84,1.5),(83,.5),(79,1)],[(81,1),(79,.5),(76,.5),(74,1),(72,1)],[(74,1),(76,1),(79,1),(74,1)],[(72,3),(0,1)]]
chords=[[48,52,55],[45,48,52],[41,45,48],[43,47,50],[48,52,55],[41,45,48],[43,47,50],[48,52,55]]

def compose(style,soft=False):
 notes=[]
 def add(track,pitch,start,dur,vel):
  if pitch: notes.append(dict(track=track,pitch=pitch,time=(start+1)*beat,duration=dur*beat,velocity=max(1,min(127,vel))))
 if style=='pop':
  tracks=[dict(program=80,volume=.27,pan=-.08,drums=False),dict(program=4,volume=.40,pan=.18,drums=False),dict(program=33,volume=.47,pan=0,drums=False),dict(program=0,volume=.58,pan=0,drums=True),dict(program=89,volume=.19,pan=-.3,drums=False)]
 else:
  tracks=[dict(program=0,volume=.80,pan=-.12,drums=False),dict(program=48,volume=.31 if not soft else .20,pan=.3,drums=False),dict(program=42,volume=.36,pan=-.28,drums=False),dict(program=46,volume=.26,pan=.1,drums=False)]
 for bar in range(16):
  base=bar*4; chord=chords[bar%8]; pos=0
  for k,(pitch,dur) in enumerate(theme[bar%8]):
   v=86+(4 if bar>=8 else 0)+(3 if k==0 else -3)
   add(0,pitch,base+pos,dur*(.85 if style=='pop' else .92),v if not soft else v-8);pos+=dur
  if style=='pop':
   for off in [0,.75,1.5,2.5,3.25]:
    for p in chord: add(1,p+12,base+off,.28,57+(bar%3)*3)
   for off in [0,.5,1.5,2,2.75,3.5]: add(2,chord[0]-12+(12 if off in [.5,2.75] else 0),base+off,.36,83)
   for p in chord: add(4,p+12,base,3.8,55)
   for off in [0,1.5,2,2.75]:add(3,36,base+off,.13,94)
   for off in [1,3]:add(3,38,base+off,.15,85)
   for i in range(8):add(3,42,base+i*.5,.09,48+(i%2)*12)
   if bar in [7,15]:
    for off in [3.25,3.5,3.75]:add(3,38,base+off,.1,58+int(off*5))
  else:
   # Flowing piano left-hand arpeggios, sustained strings, cello, and harp.
   for i in range(8):add(0,chord[[0,1,2,1,0,2,1,2][i]],base+i*.5,.66,43+(i%3)*4)
   for p in chord:add(1,p+12,base+.03,3.85,54+(bar%4)*3)
   add(2,chord[0]-12,base,1.9,63);add(2,chord[2]-12,base+2,1.85,56)
   for i in range(4):add(3,chord[i%3]+24,base+i+.25,.85,35+(i%2)*7)
 # Gentle final tonic, shared ending.
 for p in [48,55,60,64,72]:add(1 if style=='pop' else 0,p,64,3.5,50)
 score=dict(duration=69*beat,tracks=tracks,notes=notes)
 name='pop' if style=='pop' else ('classical-soft' if soft else 'classical')
 (ROOT/f'{name}.json').write_text(json.dumps(score))
 return score

def vlq(n):
 out=[n&127];n>>=7
 while n:out.insert(0,(n&127)|128);n>>=7
 return bytes(out)
def midi(score,path):
 tr=[]
 for ti,t in enumerate(score['tracks']):
  ch=9 if t['drums'] else ti; events=[(0,bytes([0xc0|ch,t['program']]))]
  if ti==0:events+=[(0,b'\xff\x51\x03'+int(beat*1e6).to_bytes(3,'big'))]
  for n in score['notes']:
   if n['track']==ti:
    start=round(n['time']/beat*480);end=round((n['time']+n['duration'])/beat*480)
    events.extend([(start,bytes([0x90|ch,n['pitch'],n['velocity']])),(end,bytes([0x80|ch,n['pitch'],0]))])
  events.sort(key=lambda e:e[0]);data=b'';last=0
  for tick,msg in events:data+=vlq(tick-last)+msg;last=tick
  data+=b'\x00\xff\x2f\x00';tr.append(b'MTrk'+len(data).to_bytes(4,'big')+data)
 path.write_bytes(b'MThd'+struct.pack('>IHHH',6,1,len(tr),480)+b''.join(tr))

for style,soft in [('pop',False),('classical',False),('classical',True)]:
 score=compose(style,soft);name='pop' if style=='pop' else ('classical-soft' if soft else 'classical')
 midi(score,ROOT/f'{name}.mid')
print('Created three scores and MIDI files')
