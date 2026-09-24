#ifndef FOF_H
#define FOF_H

#define TAU 6.28318530718

float fallback(float value; float fb){
    return value!=0 ? value : fb;
}

float rnd(float seed; float i; float k){
    float value=rand(set(seed*1.6180339+0.371,i*3.1415926+0.113,k*2.7182818+0.529));
    return value;
}

float rnd_range(float seed; float i; float k; float lo; float hi){
    return fit01(rnd(seed,i,k),lo,hi);
}

vector4 aim(vector dir; float twist){
    return qmultiply(dihedral(set(0,1,0),normalize(dir)),quaternion(twist,set(0,1,0)));
}

void setup(){
    vector4 identity=set(0,0,0,1);
    addpointattrib(0,"pscale",1.0);
    addpointattrib(0,"scale",set(1,1,1));
    addpointattrib(0,"orient",identity);
    addpointattrib(0,"Cd",set(1,1,1));
    addpointattrib(0,"variant","");
    addpointattrib(0,"part","");
    setattribtypeinfo(0,"point","Cd","color");
    setattribtypeinfo(0,"point","orient","quaternion");
}

int emit(vector p; vector radii; vector4 q; vector cd; string variant; string part){
    int pt=addpoint(0,p);
    setpointattrib(0,"scale",pt,radii);
    setpointattrib(0,"orient",pt,q);
    setpointattrib(0,"Cd",pt,cd);
    setpointattrib(0,"variant",pt,variant);
    setpointattrib(0,"part",pt,part);
    return pt;
}

#endif
