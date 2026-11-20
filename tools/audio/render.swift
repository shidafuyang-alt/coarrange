import Foundation
import AVFoundation

struct Note: Decodable { let time: Double; let duration: Double; let pitch: Int; let velocity: Int; let track: Int }
struct Track: Decodable { let program: Int; let volume: Float; let pan: Float; let drums: Bool }
struct Score: Decodable { let duration: Double; let tracks: [Track]; let notes: [Note] }
struct Event { let frame: Int64; let track: Int; let pitch: UInt8; let velocity: UInt8; let on: Bool }

let input = CommandLine.arguments[1]
let output = CommandLine.arguments[2]
let score = try JSONDecoder().decode(Score.self, from: Data(contentsOf: URL(fileURLWithPath: input)))
let engine = AVAudioEngine()
let format = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 2)!
let bank = URL(fileURLWithPath: "/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls")
var instruments: [AVAudioUnitSampler] = []
for t in score.tracks {
    let sampler = AVAudioUnitSampler()
    engine.attach(sampler)
    engine.connect(sampler, to: engine.mainMixerNode, format: format)
    try sampler.loadSoundBankInstrument(at: bank, program: UInt8(t.program), bankMSB: t.drums ? 120 : 121, bankLSB: 0)
    sampler.masterGain = 20 * log10(max(t.volume, 0.001))
    sampler.sendController(10, withValue: UInt8((t.pan + 1) * 63.5), onChannel: t.drums ? 9 : 0)
    instruments.append(sampler)
}
var events: [Event] = []
for n in score.notes {
    events.append(Event(frame: Int64(n.time * 44100), track: n.track, pitch: UInt8(n.pitch), velocity: UInt8(n.velocity), on: true))
    events.append(Event(frame: Int64((n.time + n.duration) * 44100), track: n.track, pitch: UInt8(n.pitch), velocity: 0, on: false))
}
events.sort { $0.frame == $1.frame ? (!$0.on && $1.on) : $0.frame < $1.frame }
try engine.enableManualRenderingMode(.offline, format: format, maximumFrameCount: 512)
try engine.start()
let file = try AVAudioFile(forWriting: URL(fileURLWithPath: output), settings: format.settings)
let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 512)!
let endFrame = Int64(score.duration * 44100)
var eventIndex = 0
while engine.manualRenderingSampleTime < endFrame {
    let position = engine.manualRenderingSampleTime
    while eventIndex < events.count && events[eventIndex].frame <= position {
        let e = events[eventIndex]
        if e.on { instruments[e.track].startNote(e.pitch, withVelocity: e.velocity, onChannel: score.tracks[e.track].drums ? 9 : 0) }
        else { instruments[e.track].stopNote(e.pitch, onChannel: score.tracks[e.track].drums ? 9 : 0) }
        eventIndex += 1
    }
    var count = min(Int64(512), endFrame-position)
    if eventIndex < events.count { count = min(count, max(1, events[eventIndex].frame-position)) }
    let status = try engine.renderOffline(AVAudioFrameCount(count), to: buffer)
    if status == .success { try file.write(from: buffer) }
}
engine.stop()
print("Rendered \(output)")
