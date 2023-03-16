GL1 - Geometric transforms in the GPU pipeline

Group 18: Ahmed Elalamy, Alexandra Lagutova

- Task GL1.1.1: 2D translation in shader

- Task GL1.1.2: 2D matrix transform
For this task we created translation and rotation matrixes which we combined. 
For the red triangle, it's supposed to turn around itself, so we first make it to rotate around the Z axis, 
to make it rotate around itself and then translate it, like this it still rotates around itself.
For the green triangle, we first translate it and then we rotate it around the axis, making it turning around the blue triangle.
Finally, we put our transformations into the mat_transform variable for the corresponding triangles. 

- Task GL1.2.1: MVP matrix
- Task GL1.2.2: View matrix
For the construction of our view matrix, we started by defining our rotations. 
To have the position of our camera, we first rotated our x axis around the z axis by cam_angle_z. 
Then we rotated it the y axis by cam_angle_y. Finally, we multiplied by our camera matrix look_at.
This matrix has as it's second parameter the camera position [-r, 0, 0] since the distance on the x axis from the origin to the camera 
will be in the negatives. 
The third parameter is the view position point and it will be equal to [0, 0, 0] since it always looks at the origin point. 
The last parameter is the up vector equal to [0, 0, 1] because our camera is z axis oriented. 

- Task GL1.2.3: Model matrix

Group contribution:
Alexandra Lagutova (324449): 1/2
Ahmed Elalamy (324610): 1/2

