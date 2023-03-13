RT2 - Lighting and light rays

Group 18: Ahmed Elalamy, Alexandra Lagutova

- Task RT2.1: Implement Lighting Models
We first started by implementing the method lighting, for which we used formulas that are in the slides of the course 
and the assignment sheet.
We first implememted the diffuse component and we checked if the light was on the correct side of the object.
Then, we computed the specular component which was different for Phong and Blinn Phong.
The formulas for these two could also be found on course slides.
For the Phong, also had to check if the light was on the illuminated side for which we used the given method reflect.
After all our function lighting returned the global intensity of the light.
To implement render_light, we started by computing each light contribution to total intensity and we stored it in pix_color 
if it intersected our object. To which we added the ambient contribution.

- Task RT2.2: Implement shadows:
To implement shadows, we based ourselves on the lecture content.
The basic idea is that from an object point, we shoot a shadow ray, which is a ray with the object point as origin and directed towards the light source. If this shadow ray intersects with another object, then there is a shadow and therefore the contribution of the given light should be zero.
Two special cases arise: We first need to treat shadow acne. To do so, we move a bit more the object point towards the light, to make sure that the ray won't intersect with the actual object on which it originates.
The second thing to take care of is the distance to the intersection. Indeed, if we find an intersection with a given object, we need to make sure that the distance to that object is actually smaller than the distance to the light. If it is not the case, then the light is shot before the shadow can happen, therefore there is no shadow to consider.

- Task RT2.3.1: Derive iterative formula
We put all of the explenations in the pdf document TheoryExercise.pdf

- Task RT2.3.2: Implement reflections
We implemented the reflections in render_light method for which we went through all of the possible reflections,
computed if the light was reflected or not for each ray intersection and blended the pixel color with the reflection 
using the simplified formula we found in the point before. 
We also needed to update the origin of the ray and it's direction.
We put images of one reflection for mirror1 and three reflections for mirror 2.


Group contribution: