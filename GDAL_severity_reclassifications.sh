#The bash script used to process each months fire severity output from GEE
#Merging the raster tiles together
gdal_merge.py -o NBR_bribie.tif -co NUM_THREADS=ALL_CPUS -co COMPRESS=DEFLATE *.tif

#Reclassifying the raster into severity values
gdal_calc.py -A NBR_monthly.tif \
    --co NUM_THREADS=ALL_CPUS \
    --co COMPRESS=DEFLATE \
    --outfile=NBR_reclass.tif \
    --calc="1*(A<0.13) + 2*(A>=0.13)*(A<0.27) + 3*(A>=0.27)*(A<0.44) + 4*(A>=0.44)*(A<0.66) + 5*(A>=0.66)"

#To reduce the size of the image, the values were later converted to 8but tifs
gdal_calc.py --type=Byte \
    -A NBR_and_unburnt_clipped.tif \
    --co NUM_THREADS=ALL_CPUS \
    --co COMPRESS=DEFLATE \
    --outfile=NBR_and_unburnt_8bit.tif \
    --calc="1*(A==2) + 2*(A==3) + 3*(A==4) + 4*(A==5)" \
    --NoDataValue=nan

#Compressing the large reclassified file. GDAL translate was used as it fastest compression rates of the GDAL suit.
gdal_translate \
    -a_nodata 0 \
    -co NUM_THREADS=ALL_CPUS \
    -co COMPRESS=DEFLATE \
    NBR_and_unburnt_clipped.tif \
    NBR_and_unburnt_clipped_cleaned_DEFLATE.tif

#clipping the raster to the monthly fire perimeter shapefile  
rio mask \
    merged_NBR_compressed.tif \
    merged_NBR_clipped.tif \
    --crop \
    --geojson-mask - < This_months_footprint.geojson

