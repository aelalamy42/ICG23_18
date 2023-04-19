ICG PG1 - Perlin Noise, Procedural Terrain
Group 18: Ahmed Elalamy, Alexandra Lagutova

Task 2.1: 1D noise
For the implementation of this task, we first implemented 1D Perlin noise evaluation and plotting in the noise.frag.glsl file.
For it's implementation we first computed the corners with the floor function and added one to this corner to get the next one. 
Then, we took gradients at corners using a grid point (at y = 0) and a hash function to deterministically assign an integer to every grid point. 
We computed the contribution of each corner by using the formula given to us in the handout and finally we interpolated the contribution using the mix and blending weight.

Task 3.1: FBM 1D
For the fractional Brownian motion, we went through all of the num_octaves values, with the function in the handout. 
We applied the perlin_noise_1d function that we just wrote right before to our point x, using the formula in the handout. 

Task 4.1
We implemented the 2D Perlin noise in the function perlin_noise by at first finding all of our corners, which we computed using floor as in our 1D model and added corresponding to a unit vector for each side. 
Then we compute the gradients, as before with a hash function and the function gradients. 
We computed the differences vectors between cell vectors to our point to compute dot products for the scalar values for the corners (which are dot products of gradients and the difference vectors).
Then we computed the noise result using several times the mix function and the blending_weight_poly function which corresponds to a smooth interpolation function.

Task 4.2
We implemented the 2D fBm as described in the handout, using the constants of num_octaves, freq_multiplier, and ampl_multiplier given to us. 

Task 4.3
We implemented the 2D turbulence function as described in the handout, using the same constants as before. 

Task 5.1
For these three textures tex_map, tex_wood, tex_marble, we used the formulas given to us in the handout.
For the map, we checked if s ( which corresponded to the result of our point put in the fbm function) is below the water level, then we gave it the color of water. If it was not the case we applied perlin_fbm_1d to the terrain_water_level and 
finished by mixing the colors using s - terrain_water_level as the weight, as it was said in the handout.
For the wood we used the formula given to us, we did the mix with the weight in the handout.
For the marble texture, we used a different weight to put in a mix function, which was also given to us.

Task 6.1
For this last task, we started by building the function terrain_build_mesh. For which we generated the vertices based on what was asked in the data: by default they have their coordinates (which we changed to be between -0.5 and 0.5) and their height is just their elevation. However, if said elevation is under water level, we just clip it to water level and change their normal vector to make them flat.
Then, we needed to triangulate the meshes, which was also possible via the data given to us.
Finally, we used our previous work in the shaders to implement Blinn-Phong lighting.

Group contribution:
Alexandra Lagutova (324449): 1/2
Ahmed Elalamy (324610): 1/2