ICG GL2 - Meshes in the GPU pipeline

Group 18: Ahmed Elalamy, Alexandra Lagutova

Task GL2.1.1: Compute triangle normals and opening angles

For this first task, we went through all of the faces of our triangles, we computed the normal vector to each triangle in the mesh, by at first taking the cross product between two adequate edges, which we deduced by using the right hand rule. We then push the normalized result into the array tri_normals. 
Then, we compute the weights for each vertex of a triangle, by computing the angle between each pair of edges. We store the result in angle_weights. 

Task GL2.1.2: Compute vertex normals

For this task, we use the formula given to us in the handout.
We go through all the faces and compute the contribution of each vertex by scaling the normal by each of the weight and then adding it to the accumulator. One important thing for this computation is to normalize the contribution after all the additions, so that we still have a unitary normal vector at the end of it.

Task GL2.2.1: Pass normals to fragment shader

To start this task, we added the code which does the computation of the model-view-projection matrix mat_mvp that we did last week to the mesh_render.js file.
Then we created varying variables vertex_to_fragment in the vertex and fragment shader files. In the vertex shader we pass the normal vector directly to the fragment shader. 
In the fragment shader we used this varying variable to compute the fake color with the formula given to us in the handout. 

Task GL2.2.2: Transforming the normals

In this task, we calculated mat_model_view, and mat_normals_to_view. For mat_model_view, we at just did the multiplication of mat model and mat view, since it puts the model in the coordinates corresponding to the view.
Then we used the formula seen in class that for normal we should use the inverse transposed of the mat_model_view matrix. As our normal vectors are 3 dimensional, we transformed the 4x4 matrix into a 3x3 one and did the transpose and the inversion.
Now to transform the normals to camera space in the vertex shader. This result needs to be normalized as the transformation may have created some scaling that is not wanted in unitary normal vectors.

Task GL2.3: Gouraud lighting

For the Gouraud lighting, we used the formula given to us in the handout and, as it is a per-vertex lighting, computed it in shade_pervertex.VERT.glsl. We first tranform every useful vector in our computations to camera view coordinates. Then, we used material_color as the color for every component (except ambient for which we used material_color * material_ambient as suggested). We also needed to compute the halway vector. For this we used the same formula as in RT2 but in camera space where the camera is the origin. Therefore, for example, the direction to camera vector that we had previously is now just the vector pointing from the vertex position towards the origin, which is just negating the vertex position vector. We always normalize vectors that we compute from additions and substractions to get back a unitary vector. 
Then we used this value in shade_pervertex.frag.js and displayed the color.


Task GL2.4: Phong lighting

For the Phong lighting, we used the formula given to us in the handout and, as it is a per-pixel lighting, computed it in shade_perpixel.FRAG.glsl. We used the same values as before for the materials. In the vertex shader, we computed various necessary vectors that were given to us in model coordinates to camera coordinates, and normalizing them as always. Then in the fragment shader, we computed the halway vector and the color as above. 

Group contribution:
Alexandra Lagutova (324449): 1/2
Ahmed Elalamy (324610): 1/2