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

Group contribution:
Alexandra Lagutova (324449): 1/2
Ahmed Elalamy (324610): 1/2

