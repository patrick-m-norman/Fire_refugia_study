setwd("work_directory")
      
library(data.table)
library(dismo)
library(gbm)
library(dplyr)
library(ggplot2)
library(caret)
library(pROC)
library(ModelMetrics)
library(ROCR)
  
options(scipen=999)
  
#Reading in dataset of values associated with each grid square
data <- fread('BRT_dataset.csv')
data$nbr <- replace(data$nbr, data$nbr < 0, 0)
  
#ensuring variable types are correct
data$nbr <- as.numeric(data$nbr)
data$vegetation <- as.factor(data$vegetation)
data$tpi <- as.factor(data$tpi)
data$max_ffdi <- as.integer(data$max_ffdi)
  
#subsample of dataset
subsample <-  data %>% 
  select(id, nbr, tpi, vegetation,  twi, slope, aspect, roughness, terrain_ru,mean_short, max_ffdi, vari, ndiib6)
  
set.seed(321)
indexes = createDataPartition(subsample$nbr, p = .95, list = F)
test = subsample[indexes, ]
train = subsample[-indexes, ]
  
test_1st_run <- sample_n(test, 356620)
set.seed(123)
test_2nd_run <- sample_n(test, 356620)
set.seed(356)
independent <- sample_n(test, 356620)
set.seed(111)
independent_2 <- sample_n(test, 356620)


#running the BRT model
gbm_model <- gbm.step(data=test_1st_run, gbm.x = c(3:13),  gbm.y = 2, family = "gaussian", tree.complexity = 5, learning.rate = 0.05, bag.fraction = 0.5,use = "complete.obs")

#Plotting the results of the model
summary(gbm_model)
gbm.plot.fits(gbm_model)
#par(mfrow=c(1,3))
gbm.plot(gbm_model, n.plots=3, write.title = F, mask.presence=TRUE)

  
#Interrogating the output
find.int <- gbm.interactions(gbm_model)
find.int$interactions
find.int$rank.list

#Checking the accuracy of the final model using predictions
preds <- predict.gbm(gbm_model, independent, n.trees=gbm_model$gbm.call$best.trees, type="response")

#independent data set
calc.deviance(independent$nbr,preds,calc.mean=T, family = "gaussian")
rocCurve.gbm <- roc(independent$nbr,preds)

#plotting the roc curve
plot(rocCurve.gbm)
auc(rocCurve.gbm)

#Calculating the root meas square error
rmse.gbm<-rmse(independent$nbr, preds)
print(rmse.gbm)

#creating the predicted dataset
preds_nbr <- independent %>% 
  cbind(., preds) %>% 
  mutate(., burnt_unburnt = as.factor(if_else(nbr < 0.1, 0 ,1)))

#exporting the output
fwrite(preds_nbr, "predicted_data.csv")
  