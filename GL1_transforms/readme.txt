GL1 - Geometric transforms in the GPU pipeline

Group 18: Ahmed Elalamy, Alexandra Lagutova

- Task GL1.1.1: 2D translation in shader
For this task we basically followed what was said. First we added the vector containing the mouse offset to the vector containing the position of the given triangle, so that the position of the triangle is translated by however much we translated the mouse itself.
Then, we called the draw_triangle_with_offset shaders with the according mouse_offset and the color_blue.

- Task GL1.1.2: 2D matrix transform

- Task GL1.2.1: MVP matrix
We literally did things the same way as in the last task as hinted by the data. Then for the second part, as we know that doing the MVP matrix is equivalent to doing the three step by step matrices and as we are provided with said matrices, we just had to multiply them together in the appropriate order.
- Task GL1.2.2: View matrix
- Task GL1.2.3: Model matrix
For the model matrix, the computation consisted in three steps:
First, we have to make the planet rotate around itself. To do so we make it rotate around its Z axis that is preserved at first, using the speed provided.
Then, we have to make it to scale. Again, as we are still at the origin, this is just a scaling by the size value on every axis.
Note that these two are interchangeable as they preserve the origin.
Finally, now we can prepare the planet's orbit. To do so, we first have to suppose it's orbiting around the origin, which is done by first translating it onto the x axis by its orbit radius, then making it rotate around the Z axis using its orbit speed and phase. Now that the orbit is prepared we can just translate the whole thing around the center of the parent planet. This is done by recovering the translation that the parent was exposed to and then applying the same one to the origin of the current child so that the origin of the defined orbit is the center of the parent.
Note also that the orbit needs to be done only if we have a parent planet, otherwise we just 

Group contribution:
Alexandra Lagutova (324449): 1/2
Ahmed Elalamy (324610): 1/2

