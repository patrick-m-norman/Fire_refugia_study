#Looping multiple zonal statistics at once
setwd("PATH")

library(raster)
library(rgeos)
library(sf)
library(exactextractr)
library(dplyr)
library(plyr)
library(data.table)
library(parallel)
library(terra)
library(data.table)

options(scipen=999)

#reading in the rasters to be included in the zonal statistics
NBR <- ("raster_path/raster.tif")
twi <- ("raster_path/raster.tif")
tpi <- ("raster_path/raster.tif")
slope <- ("raster_path/raster.tif")
aspect <- ("raster_path/raster.tif")
roughness <- ("raster_path/raster.tif")
terrain_ruggedness <- ("raster_path/raster.tif")
max_short_wave <- ("raster_path/raster.tif")
mean_short_wave <- ("raster_path/raster.tif")
max_FFDI <- ("raster_path/raster.tif")
max_FWI <- ("raster_path/raster.tif")
vegetation <- ("raster_path/raster.tif")
vari <- ("raster_path/raster.tif")
ndiib6 <- ("raster_path/raster.tif")

#Creating a raster list for loop
mean_list <- as.list(c(NBR, twi,  slope, aspect, roughness, terrain_ruggedness, max_short_wave, mean_short_wave, max_FFDI, max_FWI,vari,ndiib6))
mode_list <- as.list(c(tpi,vegetation))

#reading in the polygon layer
poly_full <- st_read(dsn = '.', layer = "analysis_grid")
poly_read_full <- st_as_sf(poly_full)

  
#creating a polygon data frame to join later on
poly_data_frame <- as.data.frame(poly_full)
poly_data_frame$geometry <- NULL
poly_data_frame$index <- 1:nrow(poly_data_frame)

#Loop function for the zonal statistics per grid square
my_function <- function(x){
  raster_i <- raster(x)
  zonal_list <- exact_extract(raster_i, poly_full, fun ='mean',include_cell=FALSE,include_xy=FALSE)
  return(data.frame(zonal_list))
}

#Detecting the number of computer cores for the multi core loop
cores <- detectCores() - 1  
#Running the loop and creating a column on the grid 
results_frame <- mclapply(add_on_list, my_function, mc.cores=cores) %>% bind_cols()


#mode variable names
names(results_frame) <- c('tpi','vegetation')
#mean varibale names
names(results_frame) <- c('NBR', 'twi', 'slope', 'aspect', 'roughness', 'terrain_ruggedness', 'max_short_wave', 'mean_short_wave', 'max_FFDI', 'max_FWI','vari','ndiib6')

#Adding an id column to relate back to original grid table
results_frame$grid_id <- poly_read_full$grid_id

#exporting csv of results
fwrite(results_frame, "add_on_variables.csv")
