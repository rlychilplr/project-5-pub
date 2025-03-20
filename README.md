# project-5

Cookie clicer

## Info

Dit was een team project, ik heb aan dit project samen gewerkt met nathan

## upgrade costs

Price=`Base cost*1.15^M`
where M – the number of that type of building currently owned

### example

Base Cost - 15

1 building. 15

2 buildings. `15*1.15^1 == 15 * (1.15) == 15*1.15 = 17,25`

3 buildings. `15*1.15^2 == 15 * (1.15*1.15) == 15*1.3225 = 19,8375`

4 buildings. `15*1.15^3 == 15 * (1.15*1.15*1.15) == 15 * 1.5208 = 22,813125`

`$cost = $basecost*(1.15^$numberOwnedBuildingsThisType);`

## js-cookie

I included js-cookie so we can more easly set and manage cookies. Also the name is kinda ironic
