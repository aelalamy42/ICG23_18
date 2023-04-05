ICG GL3 - Textures, reflections, and shadows

Group 18: Ahmed Elalamy, Alexandra Lagutova


Task GL3.1.1: Sampling a texture

In this task, we sampled the color from the texture according to what was demonstrated in the data. We kept in mind that the 4th component was not needed and could therefore be discarded.

Task GL3.1.2: UV coordinates and wrapping modes

For this task, our train of thought was that, if by sampling from [0 , 0] to [1, 1] we obtained 1 tile, to repeat it 4 times it looked logical to sample on a 4 times bigger square. We therefore changed the sampling range to [0, 0] up to [4, 4]. To have the pattern repeat itself once going out of the range, we chose the repeat wrapping mode.

Task GL3.2.1: Projection matrix for a cube camera

Task GL3.2.2: Up vectors for cube camera

Task GL3.2.3: Reflection shader

Task GL3.3.1: Phong Lighting Shader with Shadows

This task reused most of what we needed to do in the previous assignments. We started by computing in the vertex shader the view coordinates of the vertex position and its normal. We then passed these values to the fragment shader in which we reused most of the computation done previously. 
The little difference is that here we don't have to compute the ambient component as it is already done in another pass. We first compute many vectors needed to the diffuse and specular computations, then we compute the shadowDistance in the shadow map. This is done by sampling the shadow map and retrieving the distance (AKA the depth) of the first object the light hits. When looking at how the shadow map is generated, it looks like the 3 coordinates are equal to the depth, so we chose to take the r component.
Then, to know whether or not the diffuse and specular components should be added, we needed to determine whether the distance to the light of the precise fragment we are shading is greater than the depth given in the shadow map, i.e. is the fragment in shadow because it is behind the first object the light hit. To avoid shadow acne, we needed to add a multiplicative tolerance ratio to the shadow depth, and we found that 1.05 * the shadow depth worked best for us visually.
The diffuse and specular computations are the same as seen in previous assignments.
Finally, the last part we needed to work on was the light attenuation. We compute this at the very end, and just use the computation that is directly given to us in the data. Of course this doesn't change anything if the object is in shadow, as a multiplication or division by a color of 0 will still yield 0 at the end. 

Task GL3.3.2 Blend Options


Group contribution:
Alexandra Lagutova (324449): 1/2
Ahmed Elalamy (324610): 1/2