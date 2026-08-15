import math, os, random, struct, subprocess, sys, wave
from array import array
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import arabic_reshaper
from bidi.algorithm import get_display

W,H,FPS,DURATION=1080,1920,30,18
ROOT=r"C:\Users\Behnam\Desktop"
OUT=os.path.join(ROOT,"Peyvo-Instagram")
FF=os.path.join(os.environ["TEMP"],"peyvo-video-python","imageio_ffmpeg","binaries","ffmpeg-win-x86_64-v7.1.exe")
SHOTS=[
  os.path.join(ROOT,"Myket","01-peyvo-home-1080x1920.png"),
  os.path.join(ROOT,"Myket","03-peyvo-signup-1080x1920.png"),
  os.path.join(ROOT,"repair-saas-clone","repair-saas-final","store-assets","cafebazaar","04-customer-login-store.png"),
]
LOGO=Image.open(os.path.join(ROOT,"Peyvo-CafeBazaar-512.png")).convert("RGBA")
WORKSHOP=Image.open(os.path.join(ROOT,"Peyvo-Instagram","Peyvo-Cinematic-Workshop-BG.png")).convert("RGB").resize((W,H),Image.Resampling.LANCZOS)
WORKSHOP=ImageEnhance.Color(WORKSHOP).enhance(.82)
WORKSHOP=ImageEnhance.Contrast(WORKSHOP).enhance(1.08)
WORKSHOP=ImageEnhance.Brightness(WORKSHOP).enhance(.64)

# Pre-render the lighting treatment once. The background itself stays sharp;
# only these blue/green pools are diffused.
AMBIENT=Image.new("RGBA",(W+240,H+240),(0,0,0,0))
ambient_draw=ImageDraw.Draw(AMBIENT)
ambient_draw.ellipse((-260,40,620,920),fill=(0,132,255,66))
ambient_draw.ellipse((650,900,1370,1780),fill=(32,224,128,48))
AMBIENT=AMBIENT.filter(ImageFilter.GaussianBlur(125))
SHADE=Image.new("RGBA",(W,H),(0,0,0,0))
shade_draw=ImageDraw.Draw(SHADE)
for shade_y in range(H):
    edge=abs(shade_y-H*.51)/(H*.51)
    shade_draw.line((0,shade_y,W,shade_y),fill=(1,5,14,int(34+58*edge)))
FONT=r"C:\Windows\Fonts\tahoma.ttf"; BOLD=r"C:\Windows\Fonts\tahomabd.ttf"
shots=[Image.open(p).convert("RGB") for p in SHOTS]

def fa(s): return get_display(arabic_reshaper.reshape(s))
def ease(x): x=max(0,min(1,x)); return x*x*(3-2*x)
def alpha(t,a,b,fade=.45): return ease((t-a)/fade)*ease((b-t)/fade)
def text_center(im,s,y,size,color=(245,249,255),bold=True,opacity=255):
    layer=Image.new("RGBA",(W,H)); d=ImageDraw.Draw(layer); f=ImageFont.truetype(BOLD if bold else FONT,size)
    ss=fa(s); box=d.textbbox((0,0),ss,font=f); x=(W-(box[2]-box[0]))//2
    d.text((x,y),ss,font=f,fill=(*color,opacity)); im.alpha_composite(layer)
def glow_bg(t):
    # Photoreal workshop plate with a restrained cinematic push-in.
    zoom=1.008+0.022*(t/DURATION); zw=int(W*zoom); zh=int(H*zoom)
    plate=WORKSHOP.resize((zw,zh),Image.Resampling.LANCZOS).crop(((zw-W)//2,(zh-H)//2,(zw+W)//2,(zh+H)//2)).convert("RGBA")
    ax=int(72+34*math.sin(t*.22)); ay=int(72+24*math.cos(t*.18))
    plate.alpha_composite(AMBIENT.crop((ax,ay,ax+W,ay+H)))
    plate.alpha_composite(SHADE)
    return plate
def phone(im,shot,cx,cy,scale,tilt=0,opacity=255):
    sw=int(720*scale); sh=int(1460*scale)
    frame=Image.new("RGBA",(sw+38,sh+38),(0,0,0,0)); d=ImageDraw.Draw(frame)
    d.rounded_rectangle((4,4,sw+33,sh+33),radius=int(62*scale),fill=(8,12,23,245),outline=(92,126,175,120),width=max(2,int(3*scale)))
    crop=shot.resize((sw,sh),Image.Resampling.LANCZOS)
    mask=Image.new("L",(sw,sh)); ImageDraw.Draw(mask).rounded_rectangle((0,0,sw,sh),radius=int(48*scale),fill=255)
    frame.paste(crop,(19,19),mask)
    ImageDraw.Draw(frame).rounded_rectangle((int(sw*.37),12,int(sw*.63)+36,int(39*scale)),radius=20,fill=(3,7,14,255))
    if tilt: frame=frame.rotate(tilt,resample=Image.Resampling.BICUBIC,expand=True)
    shadow=Image.new("RGBA",frame.size,(0,0,0,0)); shadow.putalpha(frame.getchannel("A").filter(ImageFilter.GaussianBlur(28)))
    x=int(cx-frame.width/2); y=int(cy-frame.height/2); im.alpha_composite(shadow,(x+12,y+28));
    if opacity<255: frame.putalpha(frame.getchannel("A").point(lambda v:v*opacity//255))
    im.alpha_composite(frame,(x,y))

def make_audio(path):
    """Create an original 18-second electronic/cinematic stereo soundtrack."""
    sr=48000; count=sr*DURATION; beat=60/118
    rng=random.Random(391); left=array("f"); right=array("f")
    roots=[73.42,58.27,87.31,65.41]
    chord_ratios=[(1,1.5,2,2.4),(1,1.5,2,2.5),(1,1.5,1.875,2.5),(1,1.5,1.75,2.25)]
    accents=[3.2,5.2,8.25,11.3,14.4]
    for i in range(count):
        t=i/sr; beat_index=int(t/beat); phase=t%beat
        bar=(beat_index//4)%4; root=roots[bar]
        # Wide, side-chained synth bed.
        duck=.52+.48*(1-math.exp(-8*phase))
        pad_l=pad_r=0.0
        for j,ratio in enumerate(chord_ratios[bar]):
            freq=root*ratio
            pad_l+=math.sin(2*math.pi*freq*t + j*.31)
            pad_r+=math.sin(2*math.pi*freq*t + j*.31 + .09*(j-1.5))
        pad_l*=.035*duck; pad_r*=.035*duck
        # Bass pulse and a descending electronic kick on each beat.
        bass=.075*math.sin(2*math.pi*root*t)*(0.68+0.32*math.sin(math.pi*phase/beat)**2)
        kick=.48*math.exp(-15*phase)*math.sin(2*math.pi*(47*phase+4.8*math.exp(-17*phase)))
        # Alternating eighth-note arpeggio.
        eighth=beat/2; arp_phase=t%eighth; arp_i=int(t/eighth)
        arp_ratio=chord_ratios[bar][arp_i%4]*2
        arp_env=math.exp(-7.5*arp_phase)
        arp=.075*arp_env*(math.sin(2*math.pi*root*arp_ratio*t)+.24*math.sin(2*math.pi*root*arp_ratio*2*t))
        pan=.22*math.sin(arp_i*1.7)
        # Crisp hats and a restrained snare on beats two and four.
        noise=rng.uniform(-1,1)
        hat_phase=t%(beat/2)
        hat=.045*noise*math.exp(-52*hat_phase)
        snare=.0
        if beat_index%4 in (1,3):
            snare=.12*noise*math.exp(-23*phase)*math.sin(math.pi*min(1,phase/.05))
        # Scene changes get a clean high-frequency sweep and logo chime.
        transition_l=transition_r=0.0
        for k,at in enumerate(accents):
            dt=t-at
            if -.42<dt<0:
                q=(dt+.42)/.42
                sweep=.035*rng.uniform(-1,1)*q*q + .028*math.sin(2*math.pi*(280+1150*q)*t)*q
                transition_l+=sweep*(.85 if k%2 else 1.0); transition_r+=sweep*(1.0 if k%2 else .85)
            if 0<=dt<.85:
                env=math.exp(-4.2*dt)
                chime=.12*env*(math.sin(2*math.pi*659.25*dt)+.62*math.sin(2*math.pi*987.77*dt))
                transition_l+=chime; transition_r+=chime
        fade=min(1,t/.45,max(0,(DURATION-t)/.85))
        common=(bass+kick+hat+snare)*fade
        left.append((pad_l+common+arp*(.78-pan)+transition_l)*fade)
        right.append((pad_r+common+arp*(.78+pan)+transition_r)*fade)
    peak=max(max(abs(v) for v in left),max(abs(v) for v in right),.01)
    gain=.88/peak
    pcm=array("h")
    for l,r in zip(left,right):
        pcm.append(max(-32767,min(32767,int(l*gain*32767))))
        pcm.append(max(-32767,min(32767,int(r*gain*32767))))
    with wave.open(path,"wb") as wav:
        wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(sr); wav.writeframes(pcm.tobytes())

audio_path=os.path.join(OUT,"Peyvo-Reel-Pro-v2-Audio.wav")
make_audio(audio_path)
output_path=os.path.join(OUT,"Peyvo-Reel-Pro-v2-Cinematic.mp4")
cmd=[FF,"-y","-f","rawvideo","-pix_fmt","rgba","-s",f"{W}x{H}","-r",str(FPS),"-i","-","-i",audio_path,"-filter_complex","[1:a]highpass=f=32,lowpass=f=14500,acompressor=threshold=-17dB:ratio=2.4:attack=10:release=140,loudnorm=I=-13.5:TP=-1.2:LRA=8[a]","-map","0:v","-map","[a]","-c:v","libx264","-profile:v","high","-level","4.1","-pix_fmt","yuv420p","-preset","medium","-crf","18","-c:a","aac","-b:a","192k","-ar","48000","-shortest","-movflags","+faststart",output_path]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for n in range(FPS*DURATION):
 t=n/FPS; im=glow_bg(t)
 # restrained cinematic letterbox glow—no synthetic grid background.
 d=ImageDraw.Draw(im)
 if t<3.2:
  a=int(255*alpha(t,.15,3.15,.55)); text_center(im,"تعمیرگاه حرفه‌ای",570,76,(245,249,255),True,a); text_center(im,"مدیریت حرفه‌ای می‌خواهد.",680,58,(74,207,255),True,a)
  text_center(im,"دفتر، تماس‌های تکراری و بی‌نظمی را کنار بگذار.",820,27,(146,163,190),False,a)
 elif t<5.2:
  a=int(255*alpha(t,3.1,5.2,.45)); s=.72+.08*ease((t-3.2)/1.7); lg=LOGO.resize((int(620*s),int(620*s)),Image.Resampling.LANCZOS); lg.putalpha(lg.getchannel("A").point(lambda v:v*a//255)); im.alpha_composite(lg,((W-lg.width)//2,470)); text_center(im,"پیوو",1100,70,(245,249,255),True,a); text_center(im,"سیستم عامل تعمیرگاه شما",1200,34,(77,215,145),True,a)
 elif t<14.4:
  idx=min(2,int((t-5.2)/3.05)); local=(t-(5.2+idx*3.05))/3.05; captions=[("همه‌چیز، یک‌جا","پذیرش، تعمیر، مشتری و حساب‌وکتاب"),("برای مدل کاری شما","شخصی، تیمی یا مرکز خدمات حرفه‌ای"),("مشتری همیشه در جریان","پیگیری شفاف؛ ارتباط حرفه‌ای")]
  phone(im,shots[idx],W/2,1080+35*math.sin(local*math.pi),.78+.025*math.sin(local*math.pi),-2+4*local)
  ov=Image.new("RGBA",(W,420),(3,9,20,225)); im.alpha_composite(ov,(0,0)); text_center(im,captions[idx][0],105,52,(245,249,255),True,255); text_center(im,captions[idx][1],205,27,(125,202,244),False,255)
  d=ImageDraw.Draw(im); d.rounded_rectangle((390,300,690,307),4,fill=(36,75,112,180)); prog=int(300*local); d.rounded_rectangle((390,300,390+prog,307),4,fill=(68,216,139,255))
 else:
  a=int(255*ease((t-14.4)/.65)); lg=LOGO.resize((560,560),Image.Resampling.LANCZOS); lg.putalpha(lg.getchannel("A").point(lambda v:v*a//255)); im.alpha_composite(lg,((W-560)//2,390)); text_center(im,"تعمیرگاهت را حرفه‌ای مدیریت کن.",1030,45,(245,249,255),True,a); text_center(im,"همین امروز رایگان شروع کن",1135,31,(80,218,145),True,a); text_center(im,"peyvo.ir",1325,46,(85,184,255),True,a)
 p.stdin.write(im.tobytes())
p.stdin.close(); rc=p.wait(); sys.exit(rc)
