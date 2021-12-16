import { Answer, NumberAnswer, StringAnswer } from "../../components/Models/Answer";
import { CategoryEnum } from "../../components/Models/CategoryEnum";
import { Contact } from "../../components/Models/Contact";
import { DayEnum, Frequency } from "../../components/Models/Frequency";
import { PatientCareplan } from "../../components/Models/PatientCareplan";
import { PatientDetail } from "../../components/Models/PatientDetail";
import { PlanDefinition } from "../../components/Models/PlanDefinition";
import { Question, QuestionTypeEnum } from "../../components/Models/Question";
import { Questionnaire } from "../../components/Models/Questionnaire";
import { QuestionnaireResponse, QuestionnaireResponseStatus } from "../../components/Models/QuestionnaireResponse";
import { AnswerDtoAnswerTypeEnum, CarePlanDto, ContactDetailsDto, FrequencyDto, FrequencyDtoWeekdaysEnum, PatientDto, PlanDefinitionDto, QuestionAnswerPairDto, QuestionDtoQuestionTypeEnum, QuestionnaireResponseDto, QuestionnaireResponseDtoExaminationStatusEnum, QuestionnaireResponseDtoTriagingCategoryEnum, QuestionnaireWrapperDto } from "../../generated/models";
import BaseMapper from "./BaseMapper";


/**
 * This class maps from the internal models (used in frontend) to the external models (used in bff-api)
 */
export default class InternalToExternalMapper extends BaseMapper {

    MapQuestionnaireResponse(questionnaireResponse: QuestionnaireResponse): QuestionnaireResponseDto {
        const toReturn: QuestionnaireResponseDto = {
            id : questionnaireResponse.id,
            patient : questionnaireResponse.patient,
            questionAnswerPairs : this.mapQuestionAnswerPair(questionnaireResponse.questions),
            questionnaireId : questionnaireResponse.questionnaireId,
            carePlanId : questionnaireResponse.carePlanId
        }
        return toReturn;
    }

    mapQuestionAnswerPair(questions: Map<Question, Answer> | undefined): QuestionAnswerPairDto[] | undefined {
        const toReturn: QuestionAnswerPairDto[] = []
        questions?.forEach((answer, question) => {
            const answerNumberValue = answer instanceof NumberAnswer ? answer.answer : undefined;
            const answerStringValue = answer instanceof StringAnswer ? answer.answer : undefined;
            const qapair: QuestionAnswerPairDto = {
                answer: {
                    answerType: this.mapAnswerType(answer),
                    value: answerNumberValue ? answerNumberValue + "" : answerStringValue ? answerStringValue : "",
                },
                question: {
                    questionType: this.mapQuestionType(question.type)
                }

            }
        })

        return toReturn;
    }

    mapQuestionType(type: QuestionTypeEnum): QuestionDtoQuestionTypeEnum {
        switch (type) {
            case QuestionTypeEnum.CHOICE:
                return QuestionDtoQuestionTypeEnum.Choice;
            case QuestionTypeEnum.INTEGER:
                return QuestionDtoQuestionTypeEnum.Integer;
            case QuestionTypeEnum.OBSERVATION:
                return QuestionDtoQuestionTypeEnum.Quantity;
            case QuestionTypeEnum.STRING:
                return QuestionDtoQuestionTypeEnum.String;

            default:
                throw new Error('Could not map QuestionDtoQuestionTypeEnum ' + type)
        }

    }

    mapAnswerType(answer: Answer): AnswerDtoAnswerTypeEnum {
        if (answer instanceof NumberAnswer)
            return AnswerDtoAnswerTypeEnum.Integer

        if (answer instanceof StringAnswer)
            return AnswerDtoAnswerTypeEnum.String

        throw new Error('Could not map answer')
    }

    mapCategory(category: CategoryEnum): QuestionnaireResponseDtoTriagingCategoryEnum | undefined {
        switch (category) {
            case CategoryEnum.BLUE:
                return undefined
            case CategoryEnum.GREEN:
                return QuestionnaireResponseDtoTriagingCategoryEnum.Green
            case CategoryEnum.YELLOW:
                return QuestionnaireResponseDtoTriagingCategoryEnum.Yellow
            case CategoryEnum.RED:
                return QuestionnaireResponseDtoTriagingCategoryEnum.Red

            default:
                throw new Error('Could not map QuestionnaireResponseDtoTriagingCategoryEnum ' + category)
        }
    }

    mapCarePlan(carePlan: PatientCareplan): CarePlanDto {
        let carePlanDto = {
            id: "dummy",
            title: "Ny behandlingsplan", // TODO - set a title ...
            patientDto: this.mapPatient(carePlan.patient),
            questionnaires: carePlan.questionnaires.map(q => this.mapQuestionnaire(q)),
            planDefinitions: carePlan.planDefinitions.map(pd => this.mapPlanDefinition(pd))
        }

        return carePlanDto

    }
    mapFrequency(frequency: Frequency): FrequencyDto {

        return {
            weekdays: frequency.days.map(d => this.mapDayEnum(d)),
            timeOfDay: frequency.deadline
        }
    }

    mapDayEnum(day: DayEnum): FrequencyDtoWeekdaysEnum {
        switch (day) {
            case DayEnum.Monday:
                return FrequencyDtoWeekdaysEnum.Mon
            case DayEnum.Tuesday:
                return FrequencyDtoWeekdaysEnum.Tue;
            case DayEnum.Wednesday:
                return FrequencyDtoWeekdaysEnum.Wed;
            case DayEnum.Thursday:
                return FrequencyDtoWeekdaysEnum.Thu;
            case DayEnum.Friday:
                return FrequencyDtoWeekdaysEnum.Fri;
            case DayEnum.Saturday:
                return FrequencyDtoWeekdaysEnum.Sat;
            case DayEnum.Sunday:
                return FrequencyDtoWeekdaysEnum.Sun;

            default:
                throw new Error('Could not map category ' + day);
        }
    }

    mapQuestionnaireResponseStatus(status: QuestionnaireResponseStatus): QuestionnaireResponseDtoExaminationStatusEnum {
        switch (status) {
            case QuestionnaireResponseStatus.NotProcessed:
                return QuestionnaireResponseDtoExaminationStatusEnum.NotExamined
            case QuestionnaireResponseStatus.InProgress:
                return QuestionnaireResponseDtoExaminationStatusEnum.UnderExamination
            case QuestionnaireResponseStatus.Processed:
                return QuestionnaireResponseDtoExaminationStatusEnum.Examined
            default:
                throw new Error('Could not map QuestionnaireResponseStatus ' + status)
        }
    }

    mapWeekday(weekday: DayEnum): FrequencyDtoWeekdaysEnum {

        return FrequencyDtoWeekdaysEnum.Mon;

    }

    mapContactDetails(contactDetails: Contact): ContactDetailsDto {

        return {
            primaryPhone: contactDetails.primaryPhone,
            secondaryPhone: contactDetails.secondaryPhone,
        }

    }

    mapQuestionnaire(questionnaire: Questionnaire): QuestionnaireWrapperDto {

        return {
            questionnaire: {
                id: questionnaire.id,
                title: questionnaire.name
            },
            frequency: questionnaire.frequency ? this.mapFrequency(questionnaire.frequency) : undefined
        }

    }

    mapPlanDefinition(planDefinition: PlanDefinition): PlanDefinitionDto {

        return {
            id: planDefinition.id,
            name: planDefinition.name,
            questionnaires: planDefinition.questionnaires.map(q => this.mapQuestionnaire(q))
        }

    }

    mapPatient(patient: PatientDetail): PatientDto {
        return {
            cpr: patient.cpr,
            givenName: patient.firstname,
            familyName: patient.lastname,
            patientContactDetails: new Contact()
            //TODO : patientContactDetails: this.mapContactDetails(patient),
            //TODO : primaryRelativeContactDetails: this.mapContactDetails(patient)
        }

    }
}