from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/'source_files'/'fx'
CELL=128
COLUMNS,ROWS=6,4
SHARD_ROW=2
PAD=6

def runs(mask,axis,length):
  filled=[(mask.crop((i,0,i+1,mask.height)) if axis else mask.crop((0,i,mask.width,i+1))).getbbox() is not None for i in range(length)]
  spans,start=[],None
  for i,f in enumerate(filled+[False]):
    if f and start is None:start=i
    if not f and start is not None:spans.append((start,i)); start=None
  return spans

def main():
  atlas=Image.new('RGBA',(CELL*COLUMNS,CELL*ROWS))
  sheet=Image.open(SRC/'sparkles_3x3.webp').convert('RGBA').resize((CELL*3,CELL*3),Image.LANCZOS)
  for i in range(9):
    atlas.paste(sheet.crop((i%3*CELL,i//3*CELL,(i%3+1)*CELL,(i//3+1)*CELL)),(i%COLUMNS*CELL,i//COLUMNS*CELL))
  shards=Image.open(SRC/'shards.webp').convert('RGBA')
  mask=shards.split()[3].point(lambda v:255 if v>16 else 0)
  pieces=[]
  for top,bottom in runs(mask,0,mask.height):
    band=mask.crop((0,top,mask.width,bottom))
    for left,right in runs(band,1,band.width):
      box=mask.crop((left,top,right,bottom)).getbbox()
      pieces.append(shards.crop((left+box[0],top+box[1],left+box[2],top+box[3])))
  scale=(CELL-PAD*2)/max(max(p.size) for p in pieces)
  for i,piece in enumerate(pieces):
    piece=piece.resize((max(1,round(piece.width*scale)),max(1,round(piece.height*scale))),Image.LANCZOS)
    x,y=(i%COLUMNS)*CELL,(SHARD_ROW+i//COLUMNS)*CELL
    atlas.alpha_composite(piece,(x+(CELL-piece.width)//2,y+(CELL-piece.height)//2))
  atlas.save(ROOT/'assets'/'fx'/'sparkles.webp','WEBP',quality=90,method=6)
  print(len(pieces),'shards',atlas.size)

if __name__=='__main__':main()
