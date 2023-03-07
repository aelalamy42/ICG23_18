RT1 - Planes and Cylinders

Group 18: Ahmed Elalamy, Sara Jun, Alexandra Lagutova

- Task RT1.1: Implement Ray-Plane intersections:
To implement this task, we based ourselves on the equation we already derived in the lecture (See 1_1.png). This is a linear equation, so only one solution is possible.
We first check whether the ray is parallel to the plane or not. To do so, we already have a normal vector to the plane, so if it is also normal to the ray, then we know the ray and the plane are parallel. This simplifies the problem to a simple dot product check.
Then, if they are not parallel, we necessarily have to find a solution. We compute that t using the equation from the lecture.
The tricky part can be considered to be the normal derivation. But actually, we already have a normal vector to the plane. The only tricky part to understand is the sign of that normal. This sign is completely characterized by the dot product between the ray's direction and the plane's normal, the two vector being normalized, the dot product is simply the cosine between the two.
If the ray intersects the plane from the other side of the plane (the not visible one to the viewer), then it will form an angle with the plane normal inferior to 90 degrees, therefore the dot product will be positive. As it needs to reflect back to the other side, we need the normal's sign to be switched. We therefore add an extra minus sign.
If the ray intersects the plane from the viewer's side, it will form an angle with the plane normal superior to 90 degrees and their dot product will therefore be negative. However we need the light to reflect the same direction as the normal is already. We therefore add an extra minus sign.
Finally, we use the information on the sign of t to return true if it is visible by the viewer and false otherwise.

- Task RT1.2.1: Derive the expression for a Ray-Cylinder intersection:
To do this, we first took it back to pen and paper and tried to represent the situation visually. You can find attached 1_2.png to see our representation of the problem. This was loosely based off the method seen in class and we just then derived it mathematically in the Theory Exercises PDF file.
This task was the most time consuming for us as the maths behind it were tricky and led to many mathematical errors.

