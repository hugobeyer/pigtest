import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT=Path(__file__).resolve().parent.parent
FONT=ROOT/'tools'/'fonts'/'LilitaOne-Regular.ttf'
OUT=ROOT/'assets'/'fonts'
GLYPHS='0123456789/ABCDEFGHIJKLMNOPQRSTUVWXYZ!'
HEIGHT=128
SCALE=4
SIZE=96
ROUND=2.2
FILL_CUT=128
EDGE=14
DEPTH=5
SHADOW=(0,9)
SHADOW_BLUR=1.5
TOP='#ffffff'
BOTTOM='#eef0f5'
SIDE='#b8bcc9'
SHADE=(30,30,50,110)

def cut(mask,level):
  lo,hi=level-EDGE,level+EDGE
  return mask.point(lambda v:0 if v<=lo else 255 if v>=hi else round((v-lo)*255/(hi-lo)))


def rounded(glyph,font,stroke):
  size=(HEIGHT*SCALE*2,HEIGHT*SCALE)
  mask=Image.new('L',size)
  ImageDraw.Draw(mask).text((size[0]//2,size[1]//2),glyph,fill=255,font=font,anchor='mm',stroke_width=stroke,stroke_fill=255)
  return mask.filter(ImageFilter.GaussianBlur(ROUND*SCALE))


def bake(glyph,font):
  fill=cut(rounded(glyph,font,0),FILL_CUT)
  w,h=fill.size
  side=ImageChops.lighter(fill,ImageChops.offset(fill,0,DEPTH*SCALE))
  shadow=ImageChops.offset(side,SHADOW[0]*SCALE,SHADOW[1]*SCALE).filter(ImageFilter.GaussianBlur(SHADOW_BLUR*SCALE))
  box=fill.getbbox()
  gradient=Image.new('RGBA',(1,h))
  top,bottom=Image.new('RGB',(1,1),TOP).getpixel((0,0)),Image.new('RGB',(1,1),BOTTOM).getpixel((0,0))
  for y in range(h):
    k=min(max((y-box[1])/max(box[3]-box[1],1),0),1)
    gradient.putpixel((0,y),tuple(round(a+(b-a)*k) for a,b in zip(top,bottom))+(255,))
  image=Image.new('RGBA',(w,h))
  image.paste(Image.new('RGBA',(w,h),SHADE),mask=shadow)
  image.paste(Image.new('RGBA',(w,h),SIDE),mask=side)
  image.paste(gradient.resize((w,h)),mask=fill)
  bounds=ImageChops.lighter(side,shadow.point(lambda v:255 if v>20 else 0)).getbbox()
  return image.crop((bounds[0],0,bounds[2],h)).resize(((bounds[2]-bounds[0])//SCALE,HEIGHT),Image.LANCZOS)

def main():
  font=ImageFont.truetype(str(FONT),SIZE*SCALE)
  glyphs=[bake(glyph,font) for glyph in GLYPHS]
  sheet=Image.new('RGBA',(sum(g.width for g in glyphs),HEIGHT))
  layout,x={},0
  for glyph,image in zip(GLYPHS,glyphs):
    sheet.paste(image,(x,0))
    layout[glyph]=[x,image.width]
    x+=image.width
  OUT.mkdir(parents=True,exist_ok=True)
  sheet.save(OUT/'digits.webp','WEBP',quality=92,method=6)
  (OUT/'digits.json').write_text(json.dumps({'height':HEIGHT,'space':round(HEIGHT*.28),'glyphs':layout})+'\n')


if __name__=='__main__':main()
