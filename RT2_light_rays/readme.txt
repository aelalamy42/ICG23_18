RT2 - Lighting and light rays

Group 18: Ahmed Elalamy, Sara Jun, Alexandra Lagutova

- Task RT2.2: Implement shadows:
To implement shadows, we based ourselves on the lecture content.
The basic idea is that from an object point, we shoot a shadow ray, which is a ray with the object point as origin and directed towards the light source. If this shadow ray intersects with another object, then there is a shadow and therefore the contribution of the given light should be zero.
Two special cases arise: We first need to treat shadow acne. To do so, we move a bit more the object point towards the light, to make sure that the ray won't intersect with the actual object on which it originates.
The second thing to take care of is the distance to the intersection. Indeed, if we find an intersection with a given object, we need to make sure that the distance to that object is actually smaller than the distance to the light. If it is not the case, then the light is shot before the shadow can happen, therefore there is no shadow to consider.
  


Group contribution: